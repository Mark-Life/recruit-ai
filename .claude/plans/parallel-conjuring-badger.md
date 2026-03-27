# Plan: CRUD Repositories + API Layer (Phase 5)

## Context

The frontend UI covers all UX stories with mock data. The core domain, AI adapters, and DB schema are complete. The missing piece is the API layer connecting frontend to backend — CRUD operations on repositories, orchestration services, HTTP endpoints, and frontend query hooks.

@docs/plan/context.md
@docs/plan/stories.md
@docs/plan/plan.md

## Key Design Decisions

- **Status in domain models**: Add `JobStatus` and `TalentStatus` to domain — they represent real lifecycle states that gate which operations are valid
- **Streaming LLM responses**: LLM-powered endpoints (`POST /jobs`, `POST /jobs/:id/answers`, `POST /talents`) stream partial structured objects via NDJSON so the UI can progressively render extracted fields (skills appearing one by one, JD fields filling in). CRUD reads stay as regular JSON endpoints using typed `HttpApiEndpoint`.
- **Default org/recruiter**: Seed one org + one recruiter for the POC, hardcode IDs on the frontend (no auth)
- **PDF upload**: Accept base64-encoded PDF in JSON body for POC simplicity (avoids multipart complexity in @effect/platform)

### Streaming Architecture

```
AI SDK streamText() + Output.object()
  → partialOutputStream (AsyncIterable<Partial<T>>)
    → Effect.Stream via Stream.fromAsyncIterable
      → NDJSON response via HttpServerResponse.stream()
        → Frontend: fetch + ReadableStream reader
          → useState partial object → UI renders progressively
```

- **Why NDJSON over SSE**: simpler — each line is a JSON partial, no event framing needed. `text/x-ndjson` content type.
- **Streaming endpoints live outside `HttpApiEndpoint`**: they use raw `HttpRouter.makeRoute` + `HttpServerResponse.stream()` since the typed API layer expects single schema-validated responses. All non-streaming CRUD endpoints stay typed.
- **AI SDK does the hard part**: `streamText` with `Output.object()` gives typed `partialOutputStream` — each emission is a deepPartial of the schema, fields appear as the LLM generates them.

---

## Phase 1: Domain Model Changes [done ✅]

### 1a. Add status + createdAt to domain models

**`packages/core/src/domain/models/job-description.ts`**
- Add `JobStatus = Schema.Literal("draft", "refining", "matching", "ready")`
- Add `status: JobStatus` and `createdAt: Schema.String` to `StructuredJd`

**`packages/core/src/domain/models/talent.ts`**
- Add `TalentStatus = Schema.Literal("uploaded", "extracting", "reviewing", "matched")`
- Add `status: TalentStatus` and `createdAt: Schema.String` to `Talent`

### 1b. Add new domain errors

**`packages/core/src/domain/errors.ts`**
- Add `JobDescriptionNotFoundError` with `{ jobDescriptionId: Schema.String }`

### 1c. Update DB schema + migration

**`packages/db/src/schema/job-descriptions.ts`**
- Add `status: text("status").notNull().default("draft")`
- Add `createdAt: text("created_at").notNull()`

**`packages/db/src/schema/talents.ts`**
- Add `status: text("status").notNull().default("uploaded")`
- Add `createdAt: text("created_at").notNull()`

- Run `drizzle-kit generate` for migration

### 1d. Update existing adapters for new fields

**`packages/db/src/adapters/talent-repository-postgres.ts`**
- Add `status` and `createdAt` to `toInput` mapping

---

## Phase 2: New & Extended Ports [done ✅]

**`packages/core/src/ports/job-description-repository.ts`** (new)
```
create(jd) → StructuredJd
findById(id) → StructuredJd | JobDescriptionNotFoundError
findAll() → StructuredJd[]
updateStatus(id, status) → void | JobDescriptionNotFoundError
update(id, data) → StructuredJd | JobDescriptionNotFoundError
```

**`packages/core/src/ports/match-repository.ts`** (new)
```
createMany(matches) → Match[]
findByJobDescriptionId(id) → Match[]
findByTalentId(id) → Match[]
```

**`packages/core/src/ports/talent-repository.ts`** (extend)
- Add: `create(talent, embedding?) → Talent`
- Add: `updateSkills(id, skills) → void | TalentNotFoundError`
- Add: `updateStatus(id, status) → void | TalentNotFoundError`
- Add: `update(id, data) → Talent | TalentNotFoundError`

---

## Phase 3: New & Extended Adapters [done ✅]

Follow the exact pattern from `talent-repository-postgres.ts`:
- `TalentInput` type for compile-time safety
- `toInput()` maps DB row → encoded domain shape
- `Schema.decodeUnknownSync()` for runtime validation
- `Layer.effect()` yielding `DrizzleClient`

**`packages/db/src/adapters/job-description-repository-postgres.ts`** (new)
- Implements `JobDescriptionRepository`
- `toInput` maps flat DB row (including all JdExtraction fields) to domain shape

**`packages/db/src/adapters/match-repository-postgres.ts`** (new)
- Implements `MatchRepository`
- `toInput` reassembles flat score columns into nested `ScoreBreakdown`

**`packages/db/src/adapters/organization-repository-postgres.ts`** (new)
- Implements `OrganizationRepository` (findById already defined in port)

**`packages/db/src/adapters/talent-repository-postgres.ts`** (extend)
- Add `create`, `updateSkills`, `updateStatus`, `update` implementations

---

## Phase 3b: LLM Adapter Streaming [done ✅]

### LlmPort changes — `packages/core/src/ports/llm-port.ts`

Add streaming variants alongside existing methods:
```
streamStructureJd(params) → Stream.Stream<Partial<JdExtraction>, LlmError>
streamStructureResume(text) → Stream.Stream<Partial<ResumeExtraction>, LlmError>
streamStructureResumePdf(pdf) → Stream.Stream<Partial<ResumeExtraction>, LlmError>
streamClarifyingQuestions(raw) → Stream.Stream<Partial<ClarifyingQuestionsExtraction>, LlmError>
```

Non-streaming methods stay for use in background tasks (embedding, keyword extraction, ranking).

### Gemini adapter — `packages/ai/src/adapters/llm-adapter-gemini.ts`

For each streaming method:
1. Call `streamText()` (from `ai` SDK) with `Output.object({ schema })` instead of `generateText()`
2. Get `partialOutputStream` from the result — an `AsyncIterable<DeepPartial<T>>`
3. Wrap with `Stream.fromAsyncIterable(partialOutputStream, (e) => new LlmError(...))`
4. Add `Stream.withSpan("llm.streamStructureJd")` for tracing

```typescript
// Example pattern:
streamStructureJd: (params) =>
  Stream.unwrap(
    ai.use((google) =>
      streamText({
        model: google(config.languageModel),
        output: Output.object({ schema: jdExtractionSchema }),
        prompt: structureJdPrompt({ raw: params.raw }),
      })
    ).pipe(
      Effect.map(({ partialOutputStream }) =>
        Stream.fromAsyncIterable(partialOutputStream, (e) =>
          new LlmError({ message: "Stream failed", cause: e })
        )
      )
    )
  )
```

### GoogleAiClient — no changes needed

`use()` already wraps Promise-based calls in Effect. `streamText` returns synchronously (the stream itself is async), so `use` works as-is.

---

## Phase 4: Orchestration Services [done ✅]

**`packages/core/src/services/job-orchestration-service.ts`** (new)

Depends on: `JdEnrichmentService`, `RankingService`, `JobDescriptionRepository`, `MatchRepository`

- `createJob(rawText, title, organizationId)`:
  1. Stream `llm.structureJd` — emits partial `JdExtraction` as fields are generated
  2. On stream completion: persist full JD with status `"refining"`
  3. Stream `llm.generateClarifyingQuestions` — emits partial questions array
  4. Return: `Stream<Partial<{ jd, questions }>>` — frontend sees JD fields fill in, then questions appear

- `submitAnswers(id, answers)`:
  1. Fetch JD, stream `enrichAndStructure` with answers — emits partial enriched JD
  2. On stream completion: update persisted JD, run matching, persist matches
  3. Update status to `"ready"`
  4. Return: `Stream<Partial<StructuredJd>>` — frontend sees enriched fields stream in

- `runMatching(id)`:
  1. Non-streaming — ranking is CPU/vector-search work, not LLM generation
  2. Return `Match[]` as regular JSON

**`packages/core/src/services/talent-orchestration-service.ts`** (new)

Depends on: `ProfileIngestionService`, `TalentRepository`

- `createFromText(name, resumeText, recruiterId)`:
  1. Stream `llm.structureResume` — emits partial `ResumeExtraction` (skills, experience, education appearing progressively)
  2. On stream completion: persist talent with status `"reviewing"`, run enrichment (keywords + embedding) in background
  3. Return: `Stream<Partial<ResumeExtraction>>` — frontend sees skills/experience tags appear one by one

- `createFromPdf(name, pdfBase64, recruiterId)`:
  1. Stream `llm.structureResumePdf` — same progressive extraction
  2. On stream completion: persist, enrich
  3. Return: `Stream<Partial<ResumeExtraction>>`

- `confirmSkills(id, skills)`:
  1. Non-streaming — update skills, set status `"matched"`, return Talent as JSON

---

## Phase 5: API Endpoints

### 5a. Typed CRUD endpoints in `packages/api/src/api.ts`

These use `HttpApiEndpoint` with schema-validated JSON responses:

**JobsGroup** (`/api/jobs` prefix):
| Method | Path | Request | Response |
|--------|------|---------|----------|
| GET | `/jobs` | — | `StructuredJd[]` |
| GET | `/jobs/:id` | path `id` | `StructuredJd` |
| GET | `/jobs/:id/matches` | path `id` | `Match[]` (hydrated with talent + recruiter) |

**TalentsGroup** (`/api/talents` prefix):
| Method | Path | Request | Response |
|--------|------|---------|----------|
| GET | `/talents` | — | `Talent[]` |
| GET | `/talents/:id` | path `id` | `Talent` |
| PUT | `/talents/:id/skills` | `{ skills }` | `Talent` |
| GET | `/talents/:id/matches` | path `id` | `Match[]` (hydrated with JD) |

### 5b. Streaming endpoints — raw `HttpRouter` routes

These bypass `HttpApiEndpoint` and use `HttpServerResponse.stream()` with `text/x-ndjson`:

| Method | Path | Request body | Stream content |
|--------|------|-------------|----------------|
| POST | `/api/jobs` | `{ rawText, title, organizationId }` | NDJSON partial `{ jd, questions }` — JD fields fill in, then questions appear |
| POST | `/api/jobs/:id/answers` | `{ answers }` | NDJSON partial `StructuredJd` — enriched fields stream in |
| POST | `/api/talents` | `{ name, resumeText?, resumePdfBase64? }` | NDJSON partial `ResumeExtraction` — skills, experience stream in |

Each streaming handler:
1. Parses request body manually (via `HttpServerRequest.schemaBodyJson`)
2. Calls orchestration service which returns `Stream.Stream<Partial<T>>`
3. Maps each partial to `JSON.stringify(partial) + "\n"` → `Uint8Array`
4. Returns `HttpServerResponse.stream(encodedStream, { contentType: "text/x-ndjson" })`

### 5c. Handler files

- `packages/api/src/handlers/job-handlers.ts` — typed CRUD (list, get, matches)
- `packages/api/src/handlers/talent-handlers.ts` — typed CRUD (list, get, skills, matches)
- `packages/api/src/handlers/job-stream-handlers.ts` — streaming create + answers
- `packages/api/src/handlers/talent-stream-handlers.ts` — streaming create
- `packages/api/src/handlers/match-handlers.ts` — uses `MatchRepository` + hydration repos

### 5d. Layer composition in `packages/api/src/server.ts`

Wire typed `HttpApiBuilder.api()` groups alongside raw `HttpRouter` streaming routes. Provide transitive dependencies (DrizzleClient, DatabaseConfig, AI adapters, all repos, all services) as a single `AppLayer`.

---

## Phase 6: Frontend Wiring

### 6a. CRUD query hooks — `apps/web/lib/api.ts` (new)

TanStack Query hooks for non-streaming endpoints:
- `useJobs()`, `useJob(id)`, `useMatchesForJob(jobId)`
- `useTalents()`, `useTalent(id)`, `useConfirmSkills(id)`, `useMatchesForTalent(talentId)`

### 6b. Streaming hooks — `apps/web/lib/use-stream.ts` (new)

Custom hook `useNdjsonStream<T>()` that:
1. Calls `fetch(url, { method: "POST", body })`
2. Reads `response.body` as `ReadableStream`
3. Decodes NDJSON lines → parses each as `Partial<T>`
4. Updates `useState<Partial<T>>` on each emission
5. Returns `{ data: Partial<T> | null, isStreaming: boolean, error: Error | null }`

Streaming mutation hooks built on top:
- `useCreateJobStream()` — POST `/api/jobs`, streams partial `{ jd, questions }`
- `useSubmitAnswersStream(id)` — POST `/api/jobs/:id/answers`, streams partial `StructuredJd`
- `useCreateTalentStream()` — POST `/api/talents`, streams partial `ResumeExtraction`

### 6c. Replace mock data in pages

- `jobs/page.tsx` — `MOCK_JOBS` → `useJobs()`
- `jobs/[id]/page.tsx` — `getJobById` → `useJob(id)`, wire streaming `submitAnswers`
- `jobs/new-job-dialog.tsx` — mock submit → `useCreateJobStream()` — dialog closes, redirects to job detail page which shows fields streaming in
- `talents/page.tsx` — `MOCK_TALENTS` → `useTalents()`
- `talents/[id]/page.tsx` — `getTalentById` → `useTalent(id)`, wire `confirmSkills`
- `talents/new-talent-dialog.tsx` — mock submit → `useCreateTalentStream()` — dialog closes, redirects to talent detail page which shows skills/experience streaming in

### 6d. Progressive rendering UX

**Talent detail page** (extracting state):
- Instead of hardcoded `AnalysisStep` progress, show actual partial data arriving
- Skills badges appear one by one as `partialData.skills` array grows
- Experience entries fade in as they're extracted
- Keywords appear as enrichment completes

**Job detail page** (refining state):
- JD metadata fields (role title, location, work mode, skills) fill in progressively
- Clarifying questions appear as the second stream phase completes

### 6e. Seed data

Seed script or migration to insert a default organization and recruiter for the POC demo.

---

## Verification

1. **Unit**: Existing core scoring tests still pass (`packages/core/tests/`)
2. **Integration**: Start Docker Postgres, run migration, verify CRUD operations via adapter tests
3. **Streaming smoke test**: `curl -N POST /api/jobs` with sample JD — verify NDJSON lines arrive progressively (partial objects with fields appearing over time)
4. **CRUD smoke test**: `curl GET /api/jobs` — verify JSON array response
5. **E2E manual**: Create talent in UI → watch skills/experience stream into the detail page → confirm skills → see matches
6. **E2E manual**: Create job in UI → watch JD fields stream in → answer questions → see ranked results
7. **Lint**: `bun x ultracite check` passes
