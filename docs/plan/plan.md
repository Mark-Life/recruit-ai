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

- [ ] Docker-compose with PostgreSQL + pgvector extension
- [ ] Drizzle schema in adapter layer mapping to domain models (type-safe domain ↔ DB)
- [ ] Drizzle migrations via `drizzle-kit`
- [ ] TalentRepositoryPostgres and RecruiterRepositoryPostgres adapters
- [ ] Seed script: parse `datasets/resume_data.csv` into Talent records
- [ ] Database config as Effect Config service

## Phase 3: AI Adapters (Stories 1–3)

- [ ] EmbeddingPort adapter (Gemini Embeddings 2) — vectorize talent profiles and JDs
- [ ] VectorSearchPort adapter (pgvector) — cosine similarity search over embeddings
- [ ] LlmPort adapter — JD structuring (extract role, skills, constraints from raw text)
- [ ] LlmPort adapter — clarifying question generation (Story 2)
- [ ] ProfileIngestion service — ingest resumes, extract keywords, generate embeddings, store

## Phase 4: API Layer (Stories 4–5)

- [ ] oRPC procedure: submit raw JD → structured extraction
- [ ] oRPC procedure: get clarifying questions for a JD
- [ ] oRPC procedure: submit answers → trigger ranking → return matches
- [ ] Wire RankingService into API routes with full Layer composition (`main.ts`)

## Phase 5: UI

- [ ] JD input form (paste raw text)
- [ ] Clarifying questions flow (conversational or form-based)
- [ ] Ranked results page with score breakdowns per talent
- [ ] Recruiter contact info alongside each match
