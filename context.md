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
│ REST API     │────────>│          │─────>│ LLM Provider         │
│              │         │          │      │ (OpenAI / Anthropic) │
└──────────────┘         │          │      └─────────────────────┘
                         │          │      ┌─────────────────────┐
┌──────────────┐         │  Domain  │─────>│ Embedding Provider   │
│ Webhook      │────────>│  Core    │      │ (OpenAI / Cohere)    │
│ (resume in)  │         │          │      └─────────────────────┘
└──────────────┘         │          │      ┌─────────────────────┐
                         │          │─────>│ Vector Search        │
┌──────────────┐         │          │      │ (Pinecone / Qdrant)  │
│ CLI / Script │────────>│          │      └─────────────────────┘
│ (batch rank) │         │          │      ┌─────────────────────┐
└──────────────┘         │          │─────>│ Database             │
                         │          │      │ (Postgres / Dynamo)  │
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
- **Vector DB is swappable** - Pinecone, Qdrant, pgvector, or in-memory for tests
- **Effect.ts** - ports map to Effect Services/Layers naturally

## Tech Stack (TBD)

- **Language**: TypeScript + Effect.ts
- **Frontend**: TBD (Next.js from template, or Vite SPA)
- **Backend**: TBD (Next.js API routes, or Lambda)
- **Database**: TBD (Postgres / DynamoDB)
- **Vector DB**: TBD (Pinecone / Qdrant / pgvector)
- **LLM**: Anthropic Claude / OpenAI
- **Embeddings**: TBD
- **Infra**: Terraform on AWS (S3, CloudFront, Lambda, etc.)

## Next Steps

- [ ] Define `goal.md` - concrete goals and scope for v1
- [ ] Define `plan.md` - implementation plan with phases
- [ ] Decide on tech stack specifics
- [ ] Set up Terraform base
