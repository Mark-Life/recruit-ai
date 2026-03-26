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

## Phase 4: API Layer (Stories 4–5)

Using **Effect HTTP API** (`@effect/platform`) — schema-first, OpenAPI 3.1.0 from Effect schemas, handlers are native Effect programs. Chosen over oRPC to avoid Zod ↔ Effect Schema bridging and keep a single DI system.

- [ ] `HttpApiEndpoint` + `HttpApiGroup` definitions for all routes (reusing domain `Schema.Class`)
- [ ] `POST /api/jobs` — submit raw JD → structured extraction
- [ ] `GET /api/jobs/:id/questions` — get clarifying questions for a JD
- [ ] `POST /api/jobs/:id/answers` — submit answers → trigger ranking → return matches
- [ ] `HttpApiBuilder.group` handlers wired to RankingService via Effect Context
- [ ] Full Layer composition (`main.ts`) with `HttpApiBuilder.serve()` or `toWebHandler()` for Next.js
- [ ] OpenAPI spec via `OpenApi.fromApi()` + Scalar/Swagger docs UI layer
- [ ] Type-safe client via `HttpApiClient` for frontend consumption

## Phase 5: UI

- [ ] JD input form (paste raw text)
- [ ] Clarifying questions flow (conversational or form-based)
- [ ] Ranked results page with score breakdowns per talent
- [ ] Recruiter contact info alongside each match
