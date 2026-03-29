# Recruit AI

AI-driven recruitment platform that matches job descriptions to the best-fitting talents and their covering recruiters.

## Architecture

Hexagonal (Ports & Adapters) with Effect.ts. Core business logic has zero infrastructure dependencies — external systems are accessed through ports (interfaces) and adapters (implementations).

```
DRIVING ADAPTERS              CORE              DRIVEN ADAPTERS

┌──────────────┐         ┌──────────┐      ┌─────────────────────┐
│ REST API     │────────>│          │─────>│ LLM Provider        │
└──────────────┘         │          │      └─────────────────────┘
                         │          │      ┌─────────────────────┐
                         │  Domain  │─────>│ Embedding Provider  │
                         │  Core    │      │ (Gemini)            │
                         │          │      └─────────────────────┘
                         │          │      ┌─────────────────────┐
                         │          │─────>│ Vector Search       │
                         │          │      │ (Qdrant)            │
                         │          │      └─────────────────────┘
                         │          │      ┌─────────────────────┐
                         │          │─────>│ Database            │
                         └──────────┘      │ (PostgreSQL)        │
                                           └─────────────────────┘
```

## Packages


| Package                      | Description                                                |
| ---------------------------- | ---------------------------------------------------------- |
| `apps/web`                   | Next.js frontend                                           |
| `packages/core`              | Domain models, ports, scoring logic, orchestration         |
| `packages/db`                | Drizzle schema, migrations, PostgreSQL repository adapters |
| `packages/vector`            | Qdrant vector search adapter                               |
| `packages/ai`                | LLM and embedding adapters (Gemini via Vercel AI SDK)      |
| `packages/api`               | Effect HTTP API layer                                      |
| `packages/ui`                | Shared shadcn/ui component library                         |
| `packages/env`               | Environment variable validation                            |
| `packages/typescript-config` | Shared TypeScript configs                                  |


## Tech Stack

- **Language**: TypeScript + Effect.ts
- **Frontend**: Next.js
- **Backend**: Effect HTTP API (`@effect/platform`)
- **ORM**: Drizzle ORM
- **Database**: PostgreSQL
- **Vector DB**: Qdrant
- **Embeddings**: Gemini Embeddings
- **Build**: Turborepo + Bun
- **Linting/Formatting**: Ultracite (Biome)
- **UI**: shadcn/ui + Tailwind CSS

## Documentation

| Document | Description |
| --- | --- |
| [`docs/plan/context.md`](docs/plan/context.md) | Project vision and domain context |
| [`docs/plan/plan.md`](docs/plan/plan.md) | Implementation plan and phases |
| [`docs/plan/matching-architecture.md`](docs/plan/matching-architecture.md) | Vector matching architecture (Qdrant) |
| [`docs/plan/stories.md`](docs/plan/stories.md) | UX stories for the POC |
| [`docs/plan/datasets.md`](docs/plan/datasets.md) | Training and evaluation datasets |

## Getting Started

```bash
bun install
```

Start PostgreSQL and Qdrant:

```bash
docker compose up -d
```

Run in dev mode:

```bash
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


