# Matching Architecture: Live Query with HNSW

## Context

Currently matching is fully on-demand: every `GET /api/jobs/:id/matches` calls `RankingService.rankTalents` which re-embeds the JD via Gemini API, does a full sequential vector scan (no ANN index), scores, and persists to a `matches` table. JD embeddings are thrown away. New talents never surface in existing job matches until someone re-runs matching.

**New approach:** Store both embeddings, query pgvector live with HNSW indexes, score top-N in-app. No precomputed matches table — always fresh, always filterable, zero background infra. Bi-directional: job->talents AND talent->jobs.

---

## Phase 1: Schema Changes + Single Migration

DB is disposable — all schema changes happen at once, one migration.

### 1a. Add `embedding` column to `job_descriptions`

`**packages/db/src/schema/job-descriptions.ts**`:

```ts
import { vector } from "drizzle-orm/pg-core";
import { EMBEDDING_DIMENSIONS } from "@workspace/core/domain/models/vector";

// add to pgTable columns:
embedding: vector("embedding", { dimensions: EMBEDDING_DIMENSIONS }),
```

### 1b. HNSW indexes on both tables

`**packages/db/src/schema/talents.ts**` — replace index array:

```ts
(table) => [
  index("talents_recruiter_id_idx").on(table.recruiterId),
  index("talents_embedding_hnsw_idx")
    .using("hnsw", table.embedding.op("vector_cosine_ops"))
    .with({ m: 16, ef_construction: 200 }),
]
```

`**packages/db/src/schema/job-descriptions.ts**` — add index array:

```ts
(table) => [
  index("jd_embedding_hnsw_idx")
    .using("hnsw", table.embedding.op("vector_cosine_ops"))
    .with({ m: 16, ef_construction: 200 }),
]
```

### 1c. Collapse `skills` + `keywords` into `keywords` only

Both talents and JDs have `skills` and `keywords` arrays. In practice they're redundant — `computeKeywordOverlap` in `scoring.ts` immediately merges them into one set. Keywords get extracted twice during talent ingestion (once via `structureResume`, once via `extractKeywords`). LLM produces overlapping results.

**Collapse to `keywords` only** — the broader concept covering tech skills AND domain terms.

Schema changes:
- `packages/db/src/schema/talents.ts` — remove `skills` column, keep `keywords`
- `packages/db/src/schema/job-descriptions.ts` — remove `skills` column, keep `keywords`

Domain model changes:
- `packages/core/src/domain/models/talent.ts` — remove `skills` field
- `packages/core/src/domain/models/job-description.ts` — remove `skills` field
- `packages/core/src/domain/models/resume-extraction.ts` — remove `skills`, rename `keywords` description to cover both
- `packages/core/src/domain/models/jd-extraction.ts` — same

Scoring changes:
- `packages/core/src/domain/scoring.ts` — `computeKeywordOverlap` simplifies: no merging step, just `talent.keywords` vs `jd.keywords`

Prompt changes:
- `packages/core/src/prompts/resume-prompts.ts` — instruct LLM to extract unified `keywords` (tech skills + domain terms)
- `packages/core/src/prompts/jd-prompts.ts` — same
- `packages/core/src/prompts/keyword-prompts.ts` — update to match

Ingestion changes:
- `packages/core/src/services/profile-ingestion-service.ts` — one extraction pass instead of two
- `packages/core/src/services/talent-orchestration-service.ts` — adapt to single `keywords` field

### 1d. Delete `matches` table

- Delete `packages/db/src/schema/matches.ts`
- Remove export from `packages/db/src/schema/index.ts`

### 1e. Define Drizzle Relations (RQB v2)

Create `**packages/db/src/schema/relations.ts**`:

```ts
import { defineRelations } from "drizzle-orm";
import * as schema from "./index";

export const relations = defineRelations(schema, (r) => ({
  talents: {
    recruiter: r.one.recruiters({
      from: r.talents.recruiterId,
      to: r.recruiters.id,
    }),
  },
  jobDescriptions: {
    organization: r.one.organizations({
      from: r.jobDescriptions.organizationId,
      to: r.organizations.id,
    }),
  },
  recruiters: {
    talents: r.many.talents(),
  },
  organizations: {
    jobDescriptions: r.many.jobDescriptions(),
  },
}));
```

Export from `packages/db/src/schema/index.ts`. Pass `relations` to the Drizzle client constructor in `client.ts` to enable `db.query.*` API.

### 1f. Migration workflow

```sh
cd packages/db
bun db:generate          # generate migration SQL
# READ the generated .sql file, verify it:
#   - adds embedding column to job_descriptions
#   - creates HNSW indexes on both tables
#   - drops skills column from talents and job_descriptions
#   - drops matches table
# adjust if needed
bun db:migrate           # apply
bun db:seed              # re-seed if needed
```

---

## Phase 2: Persist JD Embeddings

### Generate embedding on `submitAnswers`

`**packages/core/src/services/job-orchestration-service.ts**`:

- Add `EmbeddingPort` as dependency
- In `submitAnswers` persist phase (after `jdRepo.update(id, { ...finalExtraction, status: "ready" })`): generate embedding from extracted summary, persist via `jdRepo.update(id, { embedding })`

`**packages/core/src/ports/job-description-repository.ts**`:

- Extend `update` method to accept `embedding` in the partial data

`**packages/db/src/adapters/job-description-repository-postgres.ts**`:

- Handle embedding in `update()` — spread as `[...embedding]` (same pattern as `talent-repository-postgres.ts`)

---

## Phase 3: Live Query — Replace Ranking Pipeline

### 3a. Rewrite `VectorSearchPort`

`**packages/core/src/ports/vector-search-port.ts**`:

```ts
export class VectorSearchPort extends Context.Tag("@recruit/VectorSearchPort")<
  VectorSearchPort,
  {
    /** Top-K talents by cosine similarity to a stored JD embedding */
    readonly searchTalentsByJobId: (
      jobId: JobDescriptionId,
      topK: number
    ) => Effect.Effect<readonly VectorCandidate[], VectorSearchError>;

    /** Top-K jobs by cosine similarity to a stored talent embedding */
    readonly searchJobsByTalentId: (
      talentId: TalentId,
      topK: number
    ) => Effect.Effect<readonly VectorCandidate[], VectorSearchError>;
  }
>() {}
```

### 3b. Implement with Drizzle QB (not raw SQL)

`**packages/db/src/adapters/vector-search-postgres.ts**`:

Use Drizzle select builder with `sql` fragments only for the pgvector operator:

```ts
// searchTalentsByJobId
db.select({
  id: talents.id,
  similarity: sql<number>`1 - (${talents.embedding} <=> ${jobDescriptions.embedding})`,
})
  .from(talents)
  .innerJoin(jobDescriptions, eq(jobDescriptions.id, sql.placeholder("jobId")))
  .where(and(
    isNotNull(talents.embedding),
    isNotNull(jobDescriptions.embedding),
  ))
  .orderBy(sql`${talents.embedding} <=> ${jobDescriptions.embedding}`)
  .limit(sql.placeholder("topK"))

// searchJobsByTalentId — mirror query, swap tables
db.select({
  id: jobDescriptions.id,
  similarity: sql<number>`1 - (${jobDescriptions.embedding} <=> ${talents.embedding})`,
})
  .from(jobDescriptions)
  .innerJoin(talents, eq(talents.id, sql.placeholder("talentId")))
  .where(and(
    isNotNull(jobDescriptions.embedding),
    isNotNull(talents.embedding),
    eq(jobDescriptions.status, "ready"),
  ))
  .orderBy(sql`${jobDescriptions.embedding} <=> ${talents.embedding}`)
  .limit(sql.placeholder("topK"))
```

Column references are type-checked. Only `<=>` is raw SQL (unavoidable).

### 3c. Add `findByIds` to TalentRepository

`**packages/core/src/ports/talent-repository.ts**` — add:

```ts
readonly findByIds: (ids: readonly TalentId[]) => Effect.Effect<readonly Talent[], ...>;
```

`**packages/db/src/adapters/talent-repository-postgres.ts**` — implement:

```ts
findByIds: (ids) =>
  db.select().from(talents).where(inArray(talents.id, ids))
```

Single query instead of N+1 (`Effect.forEach(candidates, findById, { concurrency: 10 })`).

### 3d. Rewrite `RankingService`

`**packages/core/src/services/ranking-service.ts**`:

Remove deps: `LlmPort`, `EmbeddingPort`.

New flow:

1. `vectorSearch.searchTalentsByJobId(jd.id, 50)` — live HNSW query
2. `talentRepo.findByIds(candidateIds)` — single batch query
3. `filterByHardConstraints(jd, talents)` — reuse existing pure fn
4. `scoreTalents(jd, eligible, candidates)` — reuse existing pure fn
5. Return top N

Add reverse method:

1. `vectorSearch.searchJobsByTalentId(talentId, 50)` — live HNSW query
2. `jdRepo.findByIds(candidateIds)` — batch fetch (add `findByIds` to JD repo too)
3. Score + filter
4. Return top N

### 3e. Rewrite query services

`**packages/core/src/services/job-query-service.ts**`:

```ts
getMatches: (id) => Effect.gen(function* () {
  const jd = yield* jdRepo.findById(id);
  return yield* ranking.rankTalentsByJob(jd);
})
```

`**packages/core/src/services/talent-query-service.ts**`:

```ts
getMatches: (id) => Effect.gen(function* () {
  const talent = yield* talentRepo.findById(id);
  return yield* ranking.rankJobsByTalent(talent);
})
```

Both use `RankingService` instead of `MatchRepository`.

### 3f. Rewrite orchestration services

`**packages/core/src/services/job-orchestration-service.ts**`:

- `runMatching(id)`: fetch JD, call `ranking.rankTalentsByJob(jd)`, return results
- Remove `matchRepo.createMany(matches)` — no persistence
- Remove `MatchRepository` dependency

---

## Phase 4: Delete Dead Code

1. Delete `packages/core/src/ports/match-repository.ts`
2. Delete `packages/db/src/adapters/match-repository-postgres.ts`
3. Remove `MatchRepositoryPostgresLayer` from `packages/api/src/server.ts` layer composition
4. Remove `MatchRepository` from any service layer providers
5. Keep `ScoredMatch` type (or derive from `Match` domain model) — still the return shape for the API

---

## Phase 5: Supporting Indexes (Future)

For filtered queries (when filter params are added to the matches endpoint):

```ts
index("talents_experience_years_idx").on(table.experienceYears),
// GIN indexes for array columns:
// index("talents_work_modes_idx").using("gin", table.workModes),
// index("talents_skills_idx").using("gin", table.skills),
```

pgvector HNSW doesn't support pre-filtering natively. Filters are post-filter on ANN results. Increase `topK` to compensate. Fine at 100K scale.

---

## Data Flow (After)

```
New Talent -> extract -> embed -> persist embedding to talents table
  -> immediately available in any job's live match query
  -> next screen: show matching jobs via reverse HNSW search

New Job -> extract -> answers -> embed -> persist embedding to job_descriptions
  -> next screen: show matching talents via HNSW search

GET /api/jobs/:id/matches:
  -> fetch JD (has embedding)
  -> HNSW query: top-50 talents by cosine similarity
  -> batch fetch full talent records (single inArray query)
  -> hard constraint filter (work mode, location)
  -> score on 4 factors (semantic 40%, keywords 25%, experience 20%, constraint 15%)
  -> return top N

GET /api/talents/:id/matches:
  -> fetch talent (has embedding)
  -> HNSW query: top-50 JDs by cosine similarity
  -> batch fetch full JD records (single inArray query)
  -> score + filter
  -> return top N
```

---

## Files Changed (Summary)

| File | Change |
| --- | --- |
| `packages/db/src/schema/job-descriptions.ts` | Add `embedding` column + HNSW index, remove `skills` column |
| `packages/db/src/schema/talents.ts` | Add HNSW index on `embedding`, remove `skills` column |
| `packages/db/src/schema/matches.ts` | **Delete** |
| `packages/db/src/schema/relations.ts` | **New** — Drizzle RQB v2 relations |
| `packages/db/src/schema/index.ts` | Remove `matches`, add `relations` export |
| `packages/db/src/client.ts` | Pass `relations` to Drizzle client |
| `packages/core/src/domain/models/talent.ts` | Remove `skills` field |
| `packages/core/src/domain/models/job-description.ts` | Remove `skills` field |
| `packages/core/src/domain/models/resume-extraction.ts` | Remove `skills`, update `keywords` description |
| `packages/core/src/domain/models/jd-extraction.ts` | Remove `skills`, update `keywords` description |
| `packages/core/src/domain/scoring.ts` | Simplify `computeKeywordOverlap` — no merge step |
| `packages/core/src/prompts/resume-prompts.ts` | Unified `keywords` extraction (tech + domain) |
| `packages/core/src/prompts/jd-prompts.ts` | Unified `keywords` extraction (tech + domain) |
| `packages/core/src/prompts/keyword-prompts.ts` | Update to match unified model |
| `packages/core/src/services/profile-ingestion-service.ts` | One extraction pass instead of two |
| `packages/core/src/services/talent-orchestration-service.ts` | Adapt to single `keywords` field |
| `packages/core/src/ports/vector-search-port.ts` | `searchTalentsByJobId` + `searchJobsByTalentId` |
| `packages/db/src/adapters/vector-search-postgres.ts` | Drizzle QB with `sql` for pgvector ops, both directions |
| `packages/core/src/ports/talent-repository.ts` | Add `findByIds` |
| `packages/db/src/adapters/talent-repository-postgres.ts` | Implement `findByIds` with `inArray` |
| `packages/core/src/ports/job-description-repository.ts` | Add `findByIds`, support `embedding` in `update` |
| `packages/db/src/adapters/job-description-repository-postgres.ts` | Implement `findByIds`, handle embedding persistence |
| `packages/core/src/services/ranking-service.ts` | Remove LLM/Embedding deps, add `rankTalentsByJob` + `rankJobsByTalent` |
| `packages/core/src/services/job-orchestration-service.ts` | Add embedding generation in `submitAnswers`, remove match persistence |
| `packages/core/src/services/job-query-service.ts` | `getMatches` calls `RankingService` live |
| `packages/core/src/services/talent-query-service.ts` | `getMatches` calls reverse ranking live |
| `packages/core/src/ports/match-repository.ts` | **Delete** |
| `packages/db/src/adapters/match-repository-postgres.ts` | **Delete** |
| `packages/api/src/server.ts` | Remove `MatchRepositoryPostgresLayer`, rewire deps |

---

## Implementation Order

1. **Phase 1** — All schema changes + relations + single migration
2. **Phase 2** — Persist JD embeddings in submitAnswers
3. **Phase 3** — Live query (vector search, batch fetch, ranking service, query services, orchestration)
4. **Phase 4** — Delete dead code (match repo, adapter, layer wiring)

---

## Verification

- Create a job through full flow (draft -> extract -> answers), verify `embedding` stored in `job_descriptions`
- `EXPLAIN ANALYZE` the vector search query — confirm HNSW index scan, not sequential
- Add a new talent, immediately query matches for an existing job — talent appears without re-running anything
- Create a talent, view talent matches — matching jobs appear via reverse HNSW search
- Verify no Gemini API calls during match queries (only during job/talent creation)
- Verify batch fetch: single SQL query for talent/JD records, not N+1
