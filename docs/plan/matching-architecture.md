# Matching Architecture: Live Query with Qdrant

## Context

Currently matching is fully on-demand: every `GET /api/jobs/:id/matches` calls `RankingService.rankTalents` which re-embeds the JD via Gemini API, does a full sequential vector scan (no ANN index), scores, and persists to a `matches` table. JD embeddings are thrown away. New talents never surface in existing job matches until someone re-runs matching.

**New approach:** Embeddings move out of Postgres into Qdrant. Qdrant owns all vector storage + ANN search with native payload filtering. Hard constraints (work mode, location) are pushed into Qdrant filters — only eligible candidates come back from the search. Postgres stays purely relational. Bi-directional: job->talents AND talent->jobs.

---

## Package Architecture (Hexagonal)

```
packages/core    (domain + ports)
   ↑         ↑          ↑
packages/db  packages/vector  packages/ai
(postgres)   (qdrant)         (gemini)
```

`packages/vector` — dedicated adapter package for vector search. Houses Qdrant client, adapter, config, and collection setup. Named generically so swapping Qdrant for Vespa/Pinecone/etc means replacing internals of one package without touching `core` or `db`.

---

## Data Architecture

```
POSTGRES (relational only)           QDRANT (vectors + filterable payload)
┌─────────────────────┐              ┌──────────────────────────┐
│ talents             │              │ collection: talents      │
│  - id (PK)          │◄────────────►│  - id (point ID = PG id) │
│  - name, title      │   linked     │  - vector [3072]         │
│  - keywords[]       │   by ID      │  - payload:              │
│  - experienceYears  │              │      keywords[]           │
│  - location         │              │      experienceYears      │
│  - workModes[]      │              │      workModes[]          │
│  - willingToRelocate│              │      location             │
│  - recruiterId (FK) │              │      willingToRelocate    │
│  - resumeText       │              │      status               │
│  - status           │              └──────────────────────────┘
│  (NO embedding col) │
├─────────────────────┤              ┌──────────────────────────┐
│ job_descriptions    │              │ collection: jobs         │
│  - id (PK)          │◄────────────►│  - id (point ID = PG id) │
│  - organizationId   │   linked     │  - vector [3072]         │
│  - rawText, summary │   by ID      │  - payload:              │
│  - keywords[]       │              │      keywords[]           │
│  - seniority        │              │      workMode             │
│  - workMode, etc.   │              │      location             │
│  - status, questions│              │      willingToSponsor     │
│  (NO embedding col) │              │      experienceMin/Max    │
└─────────────────────┘              │      status               │
                                     └──────────────────────────┘
```

Qdrant point IDs = Postgres primary keys. No mapping table needed.

---

## Phase 1: Schema Changes + Infra

### 1a. Remove `embedding` column from `talents` ⬜

**`packages/db/src/schema/talents.ts`**:

- Remove `embedding` column
- Remove `talents_embedding_hnsw_idx` HNSW index
- Remove `vector` import from `drizzle-orm/pg-core`
- Remove `EMBEDDING_DIMENSIONS` import

### 1b. Remove `embedding` column from `job_descriptions` ⬜

**`packages/db/src/schema/job-descriptions.ts`**:

- Remove `embedding` column
- Remove `jd_embedding_hnsw_idx` HNSW index
- Remove `vector` import and `EMBEDDING_DIMENSIONS` import

### 1c. Collapse `skills` + `keywords` into `keywords` only — PARTIAL

Both talents and JDs have `skills` and `keywords` arrays. In practice they're redundant — `computeKeywordOverlap` in `scoring.ts` immediately merges them into one set. LLM produces overlapping results.

**Collapse to `keywords` only** — the broader concept covering tech skills AND domain terms.

Schema changes: ⬜
- `packages/db/src/schema/talents.ts` — remove `skills` column, keep `keywords`
- `packages/db/src/schema/job-descriptions.ts` — remove `skills` column, keep `keywords`

Domain model changes: ✅
- `packages/core/src/domain/models/talent.ts` — remove `skills` field
- `packages/core/src/domain/models/job-description.ts` — remove `skills` field
- `packages/core/src/domain/models/resume-extraction.ts` — remove `skills`, rename `keywords` description to cover both
- `packages/core/src/domain/models/jd-extraction.ts` — same

Scoring changes: ✅
- `packages/core/src/domain/scoring.ts` — `computeKeywordOverlap` simplifies: no merging step, just `talent.keywords` vs `jd.keywords`

Prompt changes: ✅
- `packages/core/src/prompts/resume-prompts.ts` — instruct LLM to extract unified `keywords` (tech skills + domain terms)
- `packages/core/src/prompts/jd-prompts.ts` — same

Ingestion changes: ✅
- `packages/core/src/services/profile-ingestion-service.ts` — one extraction pass instead of two

### 1d. Delete `matches` table ✅

- ~~Delete `packages/db/src/schema/matches.ts`~~
- ~~Remove export from `packages/db/src/schema/index.ts`~~

### 1e. Define Drizzle Relations (RQB v2) ✅

~~Create `packages/db/src/schema/relations.ts`, export from index, pass to Drizzle client.~~

### 1f. Remove `embedding` param from TalentRepository ⬜

**`packages/core/src/ports/talent-repository.ts`** — remove `embedding` param from `create` and `update`:

```ts
readonly create: (talent: Talent) => Effect.Effect<Talent>;
readonly update: (
  id: TalentId,
  data: Partial<Omit<Talent, "id" | "recruiterId">>
) => Effect.Effect<Talent, TalentNotFoundError>;
```

**`packages/db/src/adapters/talent-repository-postgres.ts`** — remove all embedding handling (no `[...embedding]` spread, no vector column writes).

JD repository and adapter already clean — no embedding param.

### 1g. Add Qdrant to infrastructure ⬜

**`docker-compose.yml`** — add Qdrant service:

```yaml
qdrant:
  image: qdrant/qdrant:v1.14.0
  ports:
    - "6333:6333"   # REST API
    - "6334:6334"   # gRPC
  volumes:
    - qdrant_data:/qdrant/storage
```

### 1h. Create `packages/vector` ⬜

New package for vector search infrastructure. Depends on `packages/core` (for port types).

**`packages/vector/package.json`** — deps: `@qdrant/js-client-rest`, `effect`, `@recruit/core`

**`packages/vector/src/config.ts`** — Effect Config service:

```ts
export class QdrantConfig extends Context.Tag("@recruit/QdrantConfig")<
  QdrantConfig,
  { readonly url: string; readonly apiKey?: string }
>() {}
```

**`packages/vector/src/client.ts`** — QdrantClient Effect Layer:

```ts
import { QdrantClient } from "@qdrant/js-client-rest";

export class QdrantClientService extends Context.Tag("@recruit/QdrantClient")<
  QdrantClientService,
  QdrantClient
>() {
  static readonly layer = Layer.effect(
    QdrantClientService,
    Effect.gen(function* () {
      const config = yield* QdrantConfig;
      return new QdrantClient({ url: config.url, apiKey: config.apiKey });
    })
  );
}
```

**`packages/vector/src/setup.ts`** — collection bootstrap (run at startup or as script):

```ts
// talents collection
await qdrant.createCollection("talents", {
  vectors: { size: 3072, distance: "Cosine" },
});
await qdrant.createPayloadIndex("talents", {
  field_name: "keywords", field_schema: "keyword",
});
await qdrant.createPayloadIndex("talents", {
  field_name: "workModes", field_schema: "keyword",
});
await qdrant.createPayloadIndex("talents", {
  field_name: "location", field_schema: "keyword",
});
await qdrant.createPayloadIndex("talents", {
  field_name: "experienceYears", field_schema: "integer",
});
await qdrant.createPayloadIndex("talents", {
  field_name: "status", field_schema: "keyword",
});
await qdrant.createPayloadIndex("talents", {
  field_name: "willingToRelocate", field_schema: "bool",
});

// jobs collection
await qdrant.createCollection("jobs", {
  vectors: { size: 3072, distance: "Cosine" },
});
await qdrant.createPayloadIndex("jobs", {
  field_name: "keywords", field_schema: "keyword",
});
await qdrant.createPayloadIndex("jobs", {
  field_name: "workMode", field_schema: "keyword",
});
await qdrant.createPayloadIndex("jobs", {
  field_name: "location", field_schema: "keyword",
});
await qdrant.createPayloadIndex("jobs", {
  field_name: "status", field_schema: "keyword",
});
```

### 1i. Regenerate migration ⬜

Delete broken migration at `packages/db/drizzle/20260329190000_matching_phase1/`. Run `bun db:generate` to create correct migration that:
- Drops `embedding` column + HNSW index from `talents`
- Drops `embedding` column + HNSW index from `job_descriptions`
- Drops `skills` column from both tables
- Drops `matches` table

Do NOT run the migration — schema changes only.

---

## Phase 2: Qdrant Adapter + Port Redesign

### 2a. Rewrite `VectorSearchPort`

**`packages/core/src/ports/vector-search-port.ts`**:

```ts
export interface TalentPayload {
  readonly keywords: readonly string[];
  readonly workModes: readonly string[];
  readonly location: string;
  readonly experienceYears: number;
  readonly willingToRelocate: boolean;
  readonly status: string;
}

export interface JobPayload {
  readonly keywords: readonly string[];
  readonly workMode: string;
  readonly location: string;
  readonly willingToSponsorRelocation: boolean;
  readonly experienceYearsMin: number;
  readonly experienceYearsMax: number;
  readonly status: string;
}

export interface TalentFilter {
  readonly workModes?: readonly string[];
  readonly location?: string;
  readonly willingToRelocate?: boolean;
}

export class VectorSearchPort extends Context.Tag("@recruit/VectorSearchPort")<
  VectorSearchPort,
  {
    /** Upsert talent vector + filterable payload */
    readonly upsertTalent: (
      id: TalentId,
      vector: Vector,
      payload: TalentPayload
    ) => Effect.Effect<void, VectorSearchError>;

    /** Upsert job vector + filterable payload */
    readonly upsertJob: (
      id: JobDescriptionId,
      vector: Vector,
      payload: JobPayload
    ) => Effect.Effect<void, VectorSearchError>;

    /** Top-K talents by cosine similarity, with hard constraint pre-filtering */
    readonly searchTalentsByJobId: (
      jobId: JobDescriptionId,
      topK: number,
      filter?: TalentFilter
    ) => Effect.Effect<readonly VectorCandidate[], VectorSearchError>;

    /** Top-K jobs by cosine similarity to a stored talent embedding */
    readonly searchJobsByTalentId: (
      talentId: TalentId,
      topK: number
    ) => Effect.Effect<readonly VectorCandidate[], VectorSearchError>;

    readonly deleteTalent: (id: TalentId) => Effect.Effect<void, VectorSearchError>;
    readonly deleteJob: (id: JobDescriptionId) => Effect.Effect<void, VectorSearchError>;
  }
>() {}
```

Port now owns upsert/delete because embeddings live in a separate system.

### 2b. Implement `VectorSearchQdrantAdapter`

**`packages/vector/src/adapters/vector-search-qdrant.ts`**:

```ts
// upsertTalent
qdrant.upsert("talents", {
  points: [{
    id: talentId,
    vector: [...embedding],
    payload: { keywords, workModes, location, experienceYears, willingToRelocate, status },
  }],
});

// searchTalentsByJobId — two steps:
// 1. Retrieve job vector from Qdrant
const [jobPoint] = await qdrant.retrieve("jobs", { ids: [jobId], with_vector: true });
// 2. Search talents with pre-filtering
qdrant.search("talents", {
  vector: jobPoint.vector,
  limit: topK,
  filter: buildTalentFilter(jd, filter),  // hard constraints as Qdrant filter
});

// searchJobsByTalentId — mirror:
// 1. Retrieve talent vector
// 2. Search jobs collection with status: "ready" filter
```

### 2c. Hard constraint filters in Qdrant

The key advantage over pgvector. `filterByHardConstraints` logic moves into Qdrant query filters:

```ts
function buildTalentFilter(jd: StructuredJd, filter?: TalentFilter) {
  const must: QdrantCondition[] = [
    { key: "status", match: { value: "ready" } },
  ];

  // Work mode — talent must support the JD's work mode
  if (filter?.workModes) {
    must.push({ key: "workModes", match: { any: filter.workModes } });
  }

  // Location — for non-remote JDs, either location matches OR willing to relocate
  if (jd.workMode !== "remote" && filter?.location) {
    // Qdrant "should" = OR logic
    must.push({
      should: [
        { key: "location", match: { value: filter.location } },
        ...(jd.willingToSponsorRelocation
          ? [{ key: "willingToRelocate", match: { value: true } }]
          : []),
      ],
    });
  }

  return { must };
}
```

This means:
- Only work-mode-compatible talents enter the ANN search
- Location/relocation filtering happens before vector similarity
- Top-K results are already filtered — no wasted candidates
- `filterByHardConstraints` in `scoring.ts` becomes unnecessary for the primary path (keep as safety net or remove)

---

## Phase 3: Persist Embeddings via Qdrant

### 3a. Talent ingestion — embed + upsert to Qdrant

**`packages/core/src/services/profile-ingestion-service.ts`**:

After extracting keywords and generating embedding:

```ts
// Before (pgvector): talentRepo.update(id, { keywords, status: "ready" }, embedding)
// After (Qdrant):
yield* talentRepo.update(id, { keywords, status: "ready" });  // PG only, no embedding
yield* vectorSearch.upsertTalent(id, embedding, {
  keywords, workModes: talent.workModes, location: talent.location,
  experienceYears: talent.experienceYears, willingToRelocate: talent.willingToRelocate,
  status: "ready",
});
```

### 3b. JD creation — embed + upsert to Qdrant

**`packages/core/src/services/job-orchestration-service.ts`**:

In `submitAnswers`, after extraction is finalized:

```ts
const embedding = yield* embeddingPort.embed(finalExtraction.summary);
yield* jdRepo.update(id, { ...finalExtraction, status: "ready" });  // PG only
yield* vectorSearch.upsertJob(id, embedding, {
  keywords: finalExtraction.keywords, workMode: finalExtraction.workMode,
  location: finalExtraction.location,
  willingToSponsorRelocation: finalExtraction.willingToSponsorRelocation,
  experienceYearsMin: finalExtraction.experienceYearsMin,
  experienceYearsMax: finalExtraction.experienceYearsMax,
  status: "ready",
});
```

---

## Phase 4: Live Query — Replace Ranking Pipeline

### 4a. Add `findByIds` to repositories

**`packages/core/src/ports/talent-repository.ts`** — add:

```ts
readonly findByIds: (ids: readonly TalentId[]) => Effect.Effect<readonly Talent[], ...>;
```

**`packages/core/src/ports/job-description-repository.ts`** — add:

```ts
readonly findByIds: (ids: readonly JobDescriptionId[]) => Effect.Effect<readonly StructuredJd[], ...>;
```

Implement with `inArray` in both Postgres adapters.

### 4b. Rewrite `RankingService`

**`packages/core/src/services/ranking-service.ts`**:

Remove deps: `LlmPort`, `EmbeddingPort`.

New flow for `rankTalentsByJob`:

1. Fetch JD from PG: `jdRepo.findById(jobId)` — get structured data for scoring
2. Build hard constraint filter from JD fields
3. `vectorSearch.searchTalentsByJobId(jobId, 50, filter)` — Qdrant ANN with pre-filtering
4. `talentRepo.findByIds(candidateIds)` — single batch PG query
5. `scoreTalents(jd, talents, candidates)` — soft scoring (keyword overlap, experience, constraints)
6. Return top N

New flow for `rankJobsByTalent`:

1. `vectorSearch.searchJobsByTalentId(talentId, 50)` — Qdrant ANN
2. `jdRepo.findByIds(candidateIds)` — batch fetch
3. Score + return top N

No `filterByHardConstraints` call — hard constraints already handled by Qdrant filters.

### 4c. Rewrite query services

**`packages/core/src/services/job-query-service.ts`**:

```ts
getMatches: (id) => Effect.gen(function* () {
  const jd = yield* jdRepo.findById(id);
  return yield* ranking.rankTalentsByJob(jd);
})
```

**`packages/core/src/services/talent-query-service.ts`**:

```ts
getMatches: (id) => Effect.gen(function* () {
  const talent = yield* talentRepo.findById(id);
  return yield* ranking.rankJobsByTalent(talent);
})
```

---

## Phase 5: Delete Dead Code

1. Delete `packages/db/src/adapters/vector-search-postgres.ts` (replaced by `packages/vector`)
2. Remove `VectorSearchPostgresLayer` from `packages/api/src/server.ts`
3. Add `VectorSearchQdrantLayer` + `QdrantClientLayer` from `packages/vector` to `packages/api/src/server.ts`
4. Remove `filterByHardConstraints` from `scoring.ts` (logic now in Qdrant filters)
5. Keep `ScoredMatch` type — still the return shape for the API
6. Remove pgvector extension from Postgres setup (docker-compose, migrations)

Note: `match-repository.ts` and `match-repository-postgres.ts` already deleted.

---

## Consistency: Two-System Writes

Qdrant + Postgres are separate systems — no cross-system transactions.

**Strategy:** status-gated writes + idempotent upserts.

1. Entity created in PG with `status: "extracting"` — not visible to search
2. LLM extraction + embedding generation happen
3. PG updated with extracted data + `status: "ready"`
4. Qdrant upsert with vector + payload (idempotent by point ID)
5. If step 4 fails: entity is `"ready"` in PG but missing from Qdrant — invisible to vector search but visible in direct PG queries. Retry on next access or via background sweep.

Qdrant upserts are idempotent — safe to retry. No outbox pattern needed for POC scale.

---

## Data Flow (After)

```
New Talent -> extract -> embed
  -> PG: persist structured data (status: "ready")
  -> Qdrant: upsert(id, vector, payload)
  -> immediately available in any job's live match query
  -> next screen: show matching jobs via reverse Qdrant search

New Job -> extract -> answers -> embed
  -> PG: persist structured data (status: "ready")
  -> Qdrant: upsert(id, vector, payload)
  -> next screen: show matching talents via Qdrant search

GET /api/jobs/:id/matches:
  -> fetch JD from PG (structured data for scoring)
  -> Qdrant: search "talents" with JD vector + hard constraint filters
     (work mode, location/relocation pre-filtered at ANN level)
  -> batch fetch full talent records from PG (single inArray query)
  -> soft score on 4 factors (semantic 40%, keywords 25%, experience 20%, constraint 15%)
  -> return top N

GET /api/talents/:id/matches:
  -> Qdrant: search "jobs" with talent vector + status filter
  -> batch fetch full JD records from PG
  -> score + return top N
```

---

## pgvector vs Qdrant — Why Switch

| Aspect | pgvector + HNSW | Qdrant |
|--------|----------------|--------|
| Filtering | Post-filter on ANN results | **Native pre-filtering** — filter BEFORE ANN |
| Hard constraints | App-level `filterByHardConstraints` on top-50 | Pushed into query — top-50 already filtered |
| Quality at scale | top-50 minus filtered = potentially few results | top-50 are all eligible candidates |
| Index tuning | Manual HNSW params (m, ef_construction) | Auto-tuned, optimized out of the box |
| Infra | Embedded in PG (simpler) | Separate service (one more container) |
| Consistency | Single-DB transactional | Two-system, eventually consistent |
| Scaling | Tied to PG instance | Independent scaling of vector workload |

The pre-filtering advantage is decisive for this use case. Work mode + location constraints eliminate a large fraction of the talent pool — filtering after ANN wastes most of the top-K budget.

---

## Files Changed (Summary)

| File | Change |
| --- | --- |
| `docker-compose.yml` | Add Qdrant service |
| `packages/db/src/schema/job-descriptions.ts` | Remove `embedding` column + HNSW index, remove `skills` column |
| `packages/db/src/schema/talents.ts` | Remove `embedding` column + HNSW index, remove `skills` column |
| `packages/db/src/schema/matches.ts` | **Deleted** ✅ |
| `packages/db/src/schema/relations.ts` | **Created** ✅ |
| `packages/db/src/schema/index.ts` | Remove `matches`, add `relations` export ✅ |
| `packages/db/src/client.ts` | Pass `relations` to Drizzle client ✅ |
| `packages/vector/` | **New package** — Qdrant config, client, adapter, collection setup |
| `packages/vector/src/config.ts` | QdrantConfig Effect service |
| `packages/vector/src/client.ts` | QdrantClientService Effect Layer |
| `packages/vector/src/setup.ts` | Collection bootstrap script |
| `packages/vector/src/adapters/vector-search-qdrant.ts` | VectorSearchPort Qdrant adapter with payload filtering |
| `packages/core/src/domain/models/talent.ts` | Remove `skills` field ✅ |
| `packages/core/src/domain/models/job-description.ts` | Remove `skills` field ✅ |
| `packages/core/src/domain/models/resume-extraction.ts` | Remove `skills`, update `keywords` description ✅ |
| `packages/core/src/domain/models/jd-extraction.ts` | Remove `skills`, update `keywords` description ✅ |
| `packages/core/src/domain/scoring.ts` | Remove `filterByHardConstraints`, simplify `computeKeywordOverlap` ✅ |
| `packages/core/src/prompts/resume-prompts.ts` | Unified `keywords` extraction (tech + domain) ✅ |
| `packages/core/src/prompts/jd-prompts.ts` | Unified `keywords` extraction (tech + domain) ✅ |
| `packages/core/src/services/profile-ingestion-service.ts` | One extraction pass ✅, upsert to Qdrant separately (Phase 3) |
| `packages/core/src/ports/vector-search-port.ts` | Redesigned: `upsertTalent`, `upsertJob`, `searchTalentsByJobId`, `searchJobsByTalentId`, `delete*` |
| `packages/core/src/ports/talent-repository.ts` | Add `findByIds`, remove `embedding` param from `create`/`update` |
| `packages/db/src/adapters/talent-repository-postgres.ts` | Implement `findByIds`, remove embedding handling |
| `packages/core/src/ports/job-description-repository.ts` | Add `findByIds` |
| `packages/db/src/adapters/job-description-repository-postgres.ts` | Implement `findByIds` |
| `packages/db/src/adapters/vector-search-postgres.ts` | **Delete** |
| `packages/core/src/services/ranking-service.ts` | Remove LLM/Embedding deps, add `rankTalentsByJob` + `rankJobsByTalent`, use Qdrant pre-filtering |
| `packages/core/src/services/job-orchestration-service.ts` | Embed + upsert to Qdrant in `submitAnswers` |
| `packages/core/src/services/job-query-service.ts` | `getMatches` calls `RankingService` live |
| `packages/core/src/services/talent-query-service.ts` | `getMatches` calls reverse ranking live |
| `packages/core/src/ports/match-repository.ts` | **Deleted** ✅ |
| `packages/db/src/adapters/match-repository-postgres.ts` | **Deleted** ✅ |
| `packages/api/src/server.ts` | Remove `VectorSearchPostgresLayer`, add `VectorSearchQdrantLayer` + `QdrantClientLayer` from `packages/vector` |

---

## Implementation Order

1. **Phase 1** — Schema changes (drop embedding cols, drop skills from DB schemas) + remove embedding from TalentRepository + Qdrant infra + `packages/vector` scaffolding + regenerate migration
2. **Phase 2** — Redesigned VectorSearchPort + Qdrant adapter in `packages/vector`
3. **Phase 3** — Persist embeddings via Qdrant (ingestion + orchestration services)
4. **Phase 4** — Live query (ranking service, query services)
5. **Phase 5** — Delete dead code (pgvector adapter, `filterByHardConstraints`)

---

## Verification

- Create a talent through full flow (upload -> extract), verify point exists in Qdrant `talents` collection with correct vector + payload
- Create a job through full flow (draft -> extract -> answers), verify point exists in Qdrant `jobs` collection
- `GET /api/jobs/:id/matches` — confirm Qdrant search returns pre-filtered results (only work-mode-compatible talents)
- Add a new talent, immediately query matches for an existing job — talent appears without re-running anything
- Create a talent, view talent matches — matching jobs appear via reverse Qdrant search
- Verify no Gemini API calls during match queries (only during job/talent creation)
- Verify batch fetch: single SQL query for talent/JD records from PG, not N+1
- Verify hard constraint filtering: create talent with incompatible work mode, confirm it does NOT appear in Qdrant search results
- Qdrant dashboard (localhost:6333/dashboard): inspect collections, point counts, payload indexes
