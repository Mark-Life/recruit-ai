# Recruit AI

AI-driven recruitment platform that matches job descriptions to the best-fitting talents and their covering recruiters.

## Architecture

Hexagonal (Ports & Adapters) with Effect.ts. Core business logic has zero infrastructure dependencies -- external systems are accessed through ports (interfaces) and adapters (implementations).

```
                          ┌────────────────────────┐
                          │    apps/web (Next.js)  │
                          └────────────────────────┘
                                      │
                          ┌───────────v────────────┐
                          │    packages/api        │
                          │  (Effect RPC)          │
                          └───────────┬────────────┘
                                      │
              ┌───────────────────────────────────────────────┐
              │              packages/core                    │
              │                                               │
              │  ┌──────────┐  ┌──────────┐  ┌────────────┐   │
              │  │ Domain   │  │ Services │  │ Scoring    │   │
              │  │ Models   │  │          │  │ (pure fn)  │   │
              │  └──────────┘  └────┬─────┘  └────────────┘   │
              │                     │                         │
              │         ┌───────────┴───────────┐             │
              │         │       Ports           │             │
              │         │ (Context.Tag ifaces)  │             │
              │         └───────────┬───────────┘             │
              └────────────────│────│────│────────────────────┘
                               │    │    │
              ┌────────────────┘    │    └─────────────────┐
              │                     │                      │
    ┌─────────v────────┐    ┌───────v──────────┐  ┌────────v────────┐
    │  packages/db     │    │ packages/vector  │  │  packages/ai    │
    │  (Drizzle + PG)  │    │ (Qdrant)         │  │  (Gemini)       │
    └──────────────────┘    └──────────────────┘  └─────────────────┘
```

### Key decisions

- **Effect.ts everywhere**: DI via `Context.Tag`, errors as typed values, streaming with `Stream`
- **Ports = interfaces**: `LlmPort`, `EmbeddingPort`, `VectorSearchPort`, repos. Swap adapters without touching core
- **Pure scoring**: `scoring.ts` is a plain function, no Effect services, fully unit-testable

## How Matching Works

### Two-phase: vector retrieval + multi-factor scoring

```
                         Job Description
                               │
                    ┌──────────v───────────┐
                    │  Gemini Embedding    │
                    │  (3072-dim vector)   │
                    └──────────┬───────────┘
                               │
                    ┌──────────v───────────┐
                    │  Qdrant ANN Search   │
                    │  with PRE-FILTERING  │  <-- hard constraints applied BEFORE ANN
                    │  (top-50 candidates) │
                    └──────────┬───────────┘
                               │
                    ┌──────────v───────────┐
                    │  Batch fetch from PG │  <-- single inArray query, not N+1
                    └──────────┬───────────┘
                               │
                    ┌──────────v───────────┐
                    │   4-Factor Scoring   │
                    │   (pure function)    │
                    └──────────┬───────────┘
                               │
                         Top-10 Matches
```

### Scoring formula


| Factor              | Weight | How                                                     |
| ------------------- | ------ | ------------------------------------------------------- |
| Semantic similarity | 40%    | Cosine distance from Qdrant (embedding of resume vs JD) |
| Keyword overlap     | 25%    | Case-insensitive exact match: count of shared keywords / JD keyword count |
| Experience fit      | 20%    | 1.0 if in range, linear decay outside                   |
| Constraint fit      | 15%    | Work mode match + location/relocation compatibility     |


**Total** = weighted sum of the 4 factors. Sorted descending.

### Why Qdrant over pgvector

```
pgvector:  search top-50 -> then filter in app -> maybe 10 left
Qdrant:    filter first (payload indexes) -> THEN search top-50 -> all 50 eligible
```

Hard constraints (work mode, location, relocation) eliminate large fractions of the talent pool.
With pgvector post-filtering, most of the top-K budget is wasted on ineligible candidates.
Qdrant's **native pre-filtering** ensures every returned candidate already passes hard constraints.

Additionally, pgvector caps vectors at **2000 dimensions**. Gemini embeddings are 3072-dim -- Qdrant has no such limit.

### Hard constraint filtering (Qdrant payload filters)

```
must:
  - status = "ready"
  - workModes contains [jd.workMode]      # talent supports the required work mode
  - OR:
      location = jd.location              # same city/region
      willingToRelocate = true             # if JD sponsors relocation
```

Only candidates passing these filters enter the ANN vector search.

### Bi-directional matching

Same mechanism in both directions:


| Direction      | Vector source    | Search collection    | Use case                                     |
| -------------- | ---------------- | -------------------- | -------------------------------------------- |
| Job -> Talents | Job embedding    | `talents` collection | Recruiter posts JD, sees matching candidates |
| Talent -> Jobs | Talent embedding | `jobs` collection    | Talent uploaded, sees matching open roles    |


## Data Flow

### Job creation

```
Raw JD text
  -> LLM extracts structured fields (stream)
  -> LLM generates clarifying questions (stream)
  -> User answers questions
  -> LLM re-extracts with enriched text (stream)
  -> Gemini embeds summary -> Qdrant upsert
  -> PG stores structured data (status: "ready")
```

### Talent creation

```
Resume (text or PDF)
  -> LLM extracts structured fields (stream)
  -> User reviews/confirms keywords
  -> Gemini embeds profile -> Qdrant upsert
  -> PG stores structured data (status: "matched")
```

### Live match query (no pre-computation)

```
GET /api/jobs/:id/matches
  -> PG: fetch JD (for scoring context)
  -> Qdrant: ANN search "talents" with JD vector + hard filters
  -> PG: batch fetch talent records (single query)
  -> Pure scoring function -> sorted top-10
```

## Data Architecture

```
POSTGRES (relational)                   QDRANT (vectors + payload filters)

┌───────────────────────┐               ┌───────────────────────────┐
│ talents               │    linked     │ collection: talents       │
│  id, name, title      │<─────────────>│  point ID = PG id         │
│  keywords[]           │    by ID      │  vector [3072]            │
│  experienceYears      │               │  payload: keywords[],     │
│  location, workModes  │               │    workModes[], location, │
│  willingToRelocate    │               │    experienceYears,       │
│  recruiterId, status  │               │    willingToRelocate,     │
│  (NO embedding col)   │               │    status                 │
└───────────────────────┘               └───────────────────────────┘

┌───────────────────────┐               ┌───────────────────────────┐
│ job_descriptions      │    linked     │ collection: jobs          │
│  id, organizationId   │<─────────────>│  point ID = PG id         │
│  rawText, summary     │    by ID      │  vector [3072]            │
│  keywords[], seniority│               │  payload: keywords[],     │
│  workMode, location   │               │    workMode, location,    │
│  experienceMin/Max    │               │    experienceMin/Max,     │
│  status, questions    │               │    status                 │
│  (NO embedding col)   │               └───────────────────────────┘
└───────────────────────┘
```

Point IDs in Qdrant = Postgres primary keys. No mapping table needed.

### Consistency model

No cross-system transactions. Strategy: **status-gated writes + idempotent upserts**.

1. Entity created in PG with `status: "extracting"` -- not visible to search
2. LLM extraction + embedding generation
3. PG updated with `status: "ready"`
4. Qdrant upsert (idempotent by point ID)
5. If step 4 fails: entity visible in PG but missing from Qdrant -- safe, just invisible to vector search. Retry on next access.

## Packages


| Package                      | Description                                                 |
| ---------------------------- | ----------------------------------------------------------- |
| `apps/web`                   | Next.js frontend                                            |
| `packages/core`              | Domain models, ports, scoring logic, orchestration services |
| `packages/db`                | Drizzle schema, migrations, PostgreSQL repository adapters  |
| `packages/vector`            | Qdrant vector search adapter                                |
| `packages/ai`                | LLM and embedding adapters (Gemini via Vercel AI SDK)       |
| `packages/api`               | Effect RPC API layer (`@effect/rpc`)                        |
| `packages/ui`                | Shared shadcn/ui component library                          |
| `packages/env`               | Environment variable validation                             |
| `packages/typescript-config` | Shared TypeScript configs                                   |


## Tech Stack

- **Language**: TypeScript + Effect.ts
- **Frontend**: Next.js
- **Backend**: Effect RPC (`@effect/rpc`)
- **ORM**: Drizzle ORM
- **Database**: PostgreSQL
- **Vector DB**: Qdrant
- **AI**: Gemini (embeddings: `gemini-embedding-2-preview` 3072-dim, LLM: `gemini-2.0-flash`)
- **Build**: Turborepo + Bun
- **Linting**: Ultracite (Biome)
- **UI**: shadcn/ui + Tailwind CSS

## Getting Started

```bash
bun install
docker compose up -d    # PostgreSQL + Qdrant
bun db:migrate
bun db:seed
bun dev
```

## Commands


| Command         | Description                         |
| --------------- | ----------------------------------- |
| `bun dev`       | Start all apps in dev mode          |
| `bun run build` | Build all apps and packages         |
| `bun run lint`  | Lint all apps and packages          |
| `bun run fix`   | Auto-fix formatting and lint issues |
| `bun run check` | Check for lint/format issues        |
| `bun run test`  | Run tests                           |


## Documentation

- [docs/plan/context.md](docs/plan/context.md) — Project vision and domain context
- [docs/plan/plan.md](docs/plan/plan.md) — Implementation plan and phases
- [docs/plan/matching-architecture.md](docs/plan/matching-architecture.md) — Vector matching architecture (Qdrant migration)
- [docs/plan/stories.md](docs/plan/stories.md) — UX stories for the POC
- [docs/plan/evals.md](docs/plan/evals.md) — Evaluation plan: extraction, embedding, scoring


