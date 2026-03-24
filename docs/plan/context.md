# Recruit AI - Context

## Vision

AI-driven recruitment platform that receives job descriptions and ranks the best-matching talents along with their covering recruiters.

## Domain

- **Talents** - professionals with skills, experience, resumes, technology keywords
- **Recruiters** - agents who cover pools of talents
- **Organizations** - companies looking to hire
- **Job Descriptions** - incoming requests to match against talent pool
- **Rankings/Matches** - scored results connecting JD -> talents -> recruiters

## Architecture: Hexagonal (Ports & Adapters)

Core business logic has zero dependencies on infrastructure. External systems are accessed through ports (interfaces) and adapters (implementations).

```
DRIVING ADAPTERS              CORE              DRIVEN ADAPTERS
(inbound)                                       (outbound)

┌──────────────┐         ┌──────────┐      ┌─────────────────────┐
│ REST API     │────────>│          │─────>│ LLM Provider        │
│              │         │          │      │ (TBD)               │
└──────────────┘         │          │      └─────────────────────┘
                         │          │      ┌─────────────────────┐
┌──────────────┐         │  Domain  │─────>│ Embedding Provider  │
│ Webhook      │────────>│  Core    │      │ (Gemini Embeddings) │
│ (resume in)  │         │          │      └─────────────────────┘
└──────────────┘         │          │      ┌─────────────────────┐
                         │          │─────>│ Vector Search       │
┌──────────────┐         │          │      │ (pgvector)          │
│ CLI / Script │────────>│          │      └─────────────────────┘
│ (batch rank) │         │          │      ┌─────────────────────┐
└──────────────┘         │          │─────>│ Database            │
                         │          │      │ (PostgreSQL)        │
                         └──────────┘      └─────────────────────┘
```

### Ports (interfaces the core defines)

**Driven Ports (core calls out):**

- **LLMPort** - structured extraction from JDs, keyword extraction, summarization
- **EmbeddingPort** - vectorize talent profiles and job descriptions
- **VectorSearchPort** - semantic similarity search over talent embeddings
- **TalentRepository** - CRUD for talent profiles
- **RecruiterRepository** - find recruiters by talent coverage
- **OrganizationRepository** - CRUD for hiring organizations

**Driving Ports (outside calls in):**

- **RankingService** - receive JD, return ranked talents + recruiters
- **ProfileIngestion** - ingest and enrich resumes/profiles

### Core Use Case: Rank Talents

1. LLM structures raw job description (role, skills, experience, requirements)
2. Embedding provider vectorizes the structured JD
3. Vector search finds semantically similar talent profiles (top N)
4. Domain scoring combines semantic similarity + keyword overlap + experience relevance
5. Hydrate full talent records from DB
6. Find recruiters covering top-ranked talents
7. Return ranked matches with scores and recruiter contacts

### Key Design Decisions

- **Scoring is pure domain logic** - no external calls, fully testable
- **LLM/Embedding providers are swappable** - switch Claude <-> GPT without touching core
- **Vector DB is swappable** - pgvector in prod, in-memory for tests
- **Effect.ts** - ports map to Effect Services/Layers naturally

## Tech Stack

- **Language**: TypeScript + Effect.ts
- **Frontend**: Next.js
- **Backend**: Next.js (API routes)
- **Database**: PostgreSQL
- **Vector DB**: pgvector (PostgreSQL extension)
- **LLM**: TBD
- **Embeddings**: Gemini Embeddings 2
- **Infra**: Vercel

## Draft: Project Structure with Effect.ts

Rough scaffold showing how hexagonal architecture maps to Effect.ts services and layers. To be refined when defining `goal.md` and `plan.md`.

### Directory Layout

```
src/
├── domain/                     # Pure domain — zero infra deps
│   ├── models/                 # Schema.Class & branded types
│   │   ├── Talent.ts
│   │   ├── Recruiter.ts
│   │   ├── Organization.ts
│   │   ├── JobDescription.ts
│   │   ├── Match.ts
│   │   └── ids.ts              # Branded IDs: TalentId, RecruiterId, etc.
│   ├── scoring.ts              # Pure scoring logic (no Effect services)
│   └── errors.ts               # Schema.TaggedError for domain errors
│
├── ports/                      # Context.Tag services — contracts only
│   ├── LlmPort.ts
│   ├── EmbeddingPort.ts
│   ├── VectorSearchPort.ts
│   ├── TalentRepository.ts
│   ├── RecruiterRepository.ts
│   └── OrganizationRepository.ts
│
├── services/                   # Orchestration (driving ports)
│   ├── RankingService.ts       # JD → ranked matches
│   └── ProfileIngestion.ts     # Ingest & enrich resumes
│
├── adapters/                   # Layer implementations (driven adapters)
│   ├── llm/
│   │   └── SomeLlmAdapter.ts
│   ├── embedding/
│   │   └── GeminiEmbeddingAdapter.ts
│   ├── vector/
│   │   └── PgVectorAdapter.ts
│   └── db/
│       ├── PostgresAdapter.ts  # Shared pg connection layer
│       ├── TalentRepositoryPostgres.ts
│       ├── RecruiterRepositoryPostgres.ts
│       └── OrganizationRepositoryPostgres.ts
│
├── config/                     # Config services (Context.Tag + Config.*)
│   ├── DatabaseConfig.ts
│   ├── LlmConfig.ts
│   └── EmbeddingConfig.ts
│
├── app/                        # Next.js app (driving adapter)
│   ├── api/                    # API routes — thin wrappers calling services
│   └── ...
│
└── main.ts                     # Layer composition — single provide point
```

### Effect.ts Mapping

**Domain models** — pure `Schema.Class`, no Effect services:

```typescript
// domain/models/ids.ts
export const TalentId = Schema.String.pipe(Schema.brand("TalentId"))
export const RecruiterId = Schema.String.pipe(Schema.brand("RecruiterId"))
export const JobDescriptionId = Schema.String.pipe(Schema.brand("JobDescriptionId"))

// domain/models/Talent.ts
export class Talent extends Schema.Class<Talent>("Talent")({
  id: TalentId,
  name: Schema.String,
  skills: Schema.Array(Schema.String),
  experienceYears: Schema.Number,
  keywords: Schema.Array(Schema.String),
}) {}
```

**Ports** — `Context.Tag` with no implementation:

```typescript
// ports/LlmPort.ts
export class LlmPort extends Context.Tag("@recruit/LlmPort")<
  LlmPort,
  {
    readonly structureJd: (raw: string) => Effect.Effect<StructuredJd, LlmError>
    readonly extractKeywords: (text: string) => Effect.Effect<readonly string[], LlmError>
  }
>() {}

// ports/EmbeddingPort.ts
export class EmbeddingPort extends Context.Tag("@recruit/EmbeddingPort")<
  EmbeddingPort,
  {
    readonly embed: (text: string) => Effect.Effect<Vector, EmbeddingError>
  }
>() {}
```

**Orchestration service** — depends on ports, Layer wires them:

```typescript
// services/RankingService.ts
export class RankingService extends Context.Tag("@recruit/RankingService")<
  RankingService,
  {
    readonly rankTalents: (rawJd: string) => Effect.Effect<readonly Match[], RankingError>
  }
>() {
  static readonly layer = Layer.effect(
    RankingService,
    Effect.gen(function* () {
      const llm = yield* LlmPort
      const embedding = yield* EmbeddingPort
      const vectorSearch = yield* VectorSearchPort
      const talents = yield* TalentRepository
      const recruiters = yield* RecruiterRepository

      const rankTalents = Effect.fn("RankingService.rankTalents")(
        function* (rawJd: string) {
          const structured = yield* llm.structureJd(rawJd)
          const vector = yield* embedding.embed(structured.summary)
          const candidates = yield* vectorSearch.search(vector, 20)
          const fullTalents = yield* Effect.forEach(
            candidates,
            (c) => talents.findById(c.talentId),
            { concurrency: 10 }
          )
          const scored = scoreTalents(structured, fullTalents, candidates)
          const topTalents = scored.slice(0, 10)
          const covering = yield* recruiters.findByTalentIds(
            topTalents.map((t) => t.talentId)
          )
          return assembleMatches(topTalents, covering)
        }
      )

      return RankingService.of({ rankTalents })
    })
  )
}
```

**Adapter** — a Layer that satisfies a port:

```typescript
// adapters/embedding/GeminiEmbeddingAdapter.ts
export const GeminiEmbeddingLayer = Layer.effect(
  EmbeddingPort,
  Effect.gen(function* () {
    const config = yield* EmbeddingConfig
    const http = yield* HttpClient.HttpClient

    const embed = Effect.fn("GeminiEmbedding.embed")(function* (text: string) {
      const response = yield* http.post(/* ... */)
      return yield* HttpClientResponse.schemaBodyJson(VectorResponse)(response)
    }).pipe(
      Effect.retry(Schedule.exponential("100 millis").pipe(
        Schedule.compose(Schedule.recurs(3))
      )),
      Effect.timeout("10 seconds")
    )

    return EmbeddingPort.of({ embed })
  })
)
```

**Layer composition** — single provide at the entry point:

```typescript
// main.ts
const AppLayer = RankingService.layer.pipe(
  Layer.provideMerge(GeminiEmbeddingLayer),
  Layer.provideMerge(SomeLlmLayer),
  Layer.provideMerge(PgVectorLayer),
  Layer.provideMerge(TalentRepositoryPostgresLayer),
  Layer.provideMerge(RecruiterRepositoryPostgresLayer),
  Layer.provideMerge(postgresLayer),
  Layer.provideMerge(DatabaseConfig.layer),
  Layer.provideMerge(EmbeddingConfig.layer),
  Layer.provideMerge(LlmConfig.layer),
)
```

### Key Points

- `domain/` has zero imports from `ports/`, `adapters/`, or infra. Scoring is a pure function.
- Ports are just `Context.Tag` — Effect's type system enforces all ports are provided before running.
- Swapping adapters = swapping a Layer. Zero changes to `RankingService`.
- Testing: provide `testLayer` with in-memory implementations. Scoring is pure, test directly.
- Config lives in `Context.Tag` services, injected into adapters. Tests use `Layer.succeed(...)`.

## Next Steps

- [ ] Define `goal.md` - concrete goals and scope for v1
- [ ] Define `plan.md` - implementation plan with phases
- [ ] Set up Next.js project with Vercel deployment

