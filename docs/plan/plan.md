# Recruit AI - Implementation Plan

## Phase 1: Core Domain Foundation ✅

- [x] Create `packages/core` with Effect.ts
- [x] Domain models with Schema.Class and branded IDs (Talent, Recruiter, Organization, JobDescription, Match)
- [x] Domain errors with Schema.TaggedError
- [x] Ports as Context.Tag services (LlmPort, EmbeddingPort, VectorSearchPort, repositories)
- [x] Pure scoring logic (semantic similarity, keyword overlap, experience fit, constraint matching)
- [x] RankingService orchestration wiring all ports
- [x] Integration tests with in-memory test layers (7 tests)

## Phase 2: Database & Data Pipeline

- [x] Docker-compose with PostgreSQL + pgvector extension
- [x] Drizzle schema in `packages/db` mapping to domain models (type-safe domain ↔ DB)
- [x] Drizzle migrations via `drizzle-kit` (1.0.0-beta.19)
- [x] TalentRepositoryPostgres and RecruiterRepositoryPostgres adapters
- [ ] Seed script: parse `datasets/resume_data.csv` into Talent records
- [x] Database config as Effect Config service (`DatabaseConfig`, `DrizzleClient`)

## Phase 3: AI Adapters (Stories 1–3)

- [x] New `packages/ai` package with `@effect/ai` + `@effect/ai-google`
- [x] AiConfig service (GEMINI_API_KEY, model names, embedding dimensions)
- [x] EmbeddingPort adapter (Gemini `gemini-embedding-2-preview`, 3072 dims) — `packages/ai`
- [x] VectorSearchPort adapter (pgvector cosine similarity) — `packages/db`
- [x] LlmPort adapter (Gemini `gemini-2.0-flash`) — JD structuring via `generateObject`
- [x] LlmPort — clarifying question generation (Story 2)
- [x] ClarifyingQuestion domain model
- [x] ProfileIngestion service — enrich talent profiles with keywords + embeddings
- [x] Pre-composed layer wiring (`GeminiLlmLive`, `GeminiEmbeddingLive`)
- [ ] Seed script: parse `datasets/resume_data.csv` into Talent records (deferred)

## Phase 3.5: Backend Integration Testing & Missing Logic

Goal: broad integration tests grouped by story/feature area, validating the full backend pipeline before building the API layer.

### Test Group 1: Embedding Similarity ✅

Validates that semantic embeddings produce correct similarity rankings.

- [x] Integration test: ranks senior frontend > senior backend > veterinarian by cosine similarity (`packages/ai/tests/embedding.test.ts`)

### Test Group 2: Full Ranking Pipeline ✅

End-to-end: JD structuring → resume structuring → embedding → scoring → ranked matches.

- [x] Integration test: full pipeline with real Gemini API, verifies ranking order + score breakdown (`packages/ai/tests/ranking.test.ts`)
- [x] Core scoring unit tests: 7 tests covering keyword overlap, experience fit, work mode constraints, remote handling, recruiter mapping, empty results (`packages/core/tests/ranking-service.test.ts`)

### Test Group 3: Hard Constraint Filtering ✅

Story 4 requires: "Talents that violate hard constraints (e.g. wrong geography, no relocation) are excluded." Implemented `filterByHardConstraints` in scoring.ts, called from RankingService before scoring.

- [x] `filterByHardConstraints` pure function in `packages/core/src/domain/scoring.ts`
- [x] Integration test: excludes talent with incompatible work mode
- [x] Integration test: excludes talent in wrong location without relocation
- [x] Integration test: keeps talent in wrong location when relocation is viable
- [x] Integration test: skips location filtering for remote JDs

### Test Group 4: JD Refinement Pipeline ✅

Story 2: system generates clarifying questions for missing JD info, user answers are merged back, enriched JD is structured.

- [x] `generateClarifyingQuestions` adapter in `LlmAdapterGemini`
- [x] `ClarifyingQuestion` domain model
- [x] `mergeAnswersIntoJd` pure function in `packages/core/src/domain/jd-enrichment.ts`
- [x] `JdEnrichmentService` orchestration in `packages/core/src/services/jd-enrichment-service.ts`
- [x] Integration test: `generateClarifyingQuestions` with real Gemini API (`packages/ai/tests/jd-refinement.test.ts`)
- [x] Integration test: full refinement pipeline — incomplete JD → questions → answers → enriched `StructuredJd` with correct values

### Test Group 5: Profile Ingestion ✅

- [x] Integration test: enrich a talent profile → verify extracted keywords are reasonable + embedding is generated (`packages/ai/tests/profile-ingestion.test.ts`)

### Summary

| Area | Implementation | Tests |
|------|---------------|-------|
| Embedding similarity | ✅ Done | ✅ Integration test |
| JD structuring | ✅ Done | ✅ Unit + integration |
| Resume structuring | ✅ Done | ✅ Integration test |
| Full ranking pipeline | ✅ Done | ✅ Integration + 7 unit |
| Hard constraint exclusion | ✅ Done | ✅ 4 integration tests |
| Clarifying questions generation | ✅ Done | ✅ Integration test |
| Answer merging / JD enrichment | ✅ Done | ✅ Integration test |
| Enrichment orchestration | ✅ Done | ✅ Integration test |
| Profile ingestion | ✅ Done | ✅ Integration test |

## Phase 4: UI ✅

Build the frontend for all UX stories defined in [stories.md](./stories.md).

- [x] JD input form (paste raw text)
- [x] Clarifying questions flow (conversational or form-based)
- [x] Ranked results page with score breakdowns per talent
- [x] Recruiter contact info alongside each match

## Phase 5: API Layer ✅

Using **Effect HTTP API** (`@effect/platform`) — schema-first, OpenAPI 3.1.0 from Effect schemas, handlers are native Effect programs. Chosen over oRPC to avoid Zod ↔ Effect Schema bridging and keep a single DI system.

- [x] `HttpApiEndpoint` + `HttpApiGroup` definitions for all routes (reusing domain `Schema.Class`)
- [x] `POST /api/jobs` — submit raw JD → structured extraction
- [x] `GET /api/jobs/:id/questions` — get clarifying questions for a JD
- [x] `POST /api/jobs/:id/answers` — submit answers → trigger ranking → return matches
- [x] `HttpApiBuilder.group` handlers wired to RankingService via Effect Context
- [x] Full Layer composition (`main.ts`) with `HttpApiBuilder.serve()` or `toWebHandler()` for Next.js
- [x] OpenAPI spec via `OpenApi.fromApi()` + Scalar/Swagger docs UI layer
- [x] Type-safe client via `HttpApiClient` for frontend consumption

## Phase 6: Vector Matching Architecture (Qdrant) ✅

Migrate vector storage from Postgres (pgvector) to Qdrant. Bi-directional matching (job->talents, talent->jobs). See [`matching-architecture.md`](./matching-architecture.md).

- [x] New `packages/vector` package with Qdrant client, adapter, config, collection setup
- [x] Remove embedding columns from Postgres (talents + job_descriptions)
- [x] Remove `matches` table — matching is now live query, not persisted
- [x] Squash old migrations into single baseline
- [x] Qdrant adapter implementing `VectorSearchPort` (upsert, search, delete)
- [x] Hard constraint filtering via Qdrant payload filters (work mode, location)
- [x] Bi-directional: job match cards on talent detail view
- [x] Docker compose updated with Qdrant service
- [x] Ranking service refactored to use Qdrant-based vector search
