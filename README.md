# Atlas

Multi-tenant SaaS platform for teams to manage organizations, workspaces, projects, clients, and tasks.

## Stack

- Monorepo: `pnpm` + `turbo`
- Web: Next.js (App Router) + TypeScript
- API: Fastify + Prisma + PostgreSQL
- Worker: BullMQ + Redis
- Shared: reusable config package + UI package

## Monorepo structure

- `apps/web` - public pages + application UI
- `apps/api` - versioned API (`/api/v1`) and domain services
- `apps/worker` - async jobs (emails, audit processing, reports)
- `packages/ui` - shared UI primitives
- `packages/config` - shared eslint, prettier, and tsconfig presets

## Run locally

1. Install dependencies:
   - `pnpm install`
2. Copy envs:
   - `cp .env.example .env`
3. Start local infra (Postgres + Redis):
   - `docker compose up -d`
4. Run migrations and seed:
   - `pnpm db:migrate`
   - `pnpm db:seed`
5. Start all services:
   - `pnpm dev`

## Startup scripts

- `scripts/start-api.sh` - optionally runs `prisma migrate deploy` on boot, then starts API
- `scripts/start-web.sh` - starts Next.js production server
- `scripts/start-worker.sh` - starts BullMQ worker

## Quality gates

- Lint: `pnpm lint`
- Typecheck: `pnpm typecheck`
- Test: `pnpm test`
- Format check: `pnpm format:check`

## CI

GitHub Actions runs lint, typecheck, and tests on every push/PR.
