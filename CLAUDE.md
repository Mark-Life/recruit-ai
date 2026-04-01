# Project
## Overview

AI-powered recruitment platform. Hexagonal architecture with Effect.ts — core domain has zero infrastructure dependencies. Bun monorepo with Turborepo orchestration.

## Commands

```bash
bun dev
bun run build
bun run test
bun run typecheck
bun run check
bun run fix

# individual tests for packages
cd packages/core && bun vitest run # All core tests
cd packages/core && bun vitest run tests/scoring.test.ts # Single file

# Database
bun db:up
bun db:down
bun db:migrate
bun db:generate
bun db:seed # Seed base data (recruiters, orgs)
bun db:seed:data # Load test datasets
bun db:studio
bun db:reset # Drop all data + re-migrate
```

Important: Use `bun run test`, never `bun test` (hook enforces this).

## Architecture

Monorepo packages: packages/core, packages/db, packages/vector, packages/ai, packages/api, packages/env, packages/ui, apps/web

## Key Patterns

- Ports & Adapters: Core defines ports as Effect services (e.g., `LlmPort`, `TalentRepository`). Infrastructure packages provide `*Live` layers.
- Effect.ts everywhere: Services, error handling, dependency injection, RPC (`@effect/rpc`), Schema validation. Use Effect patterns, not raw Promises.
- Bi-directional matching: Jobs→Talents and Talents→Jobs use the same scoring function.
