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

## Tenancy & RBAC API (MVP)

- `GET /api/v1/organizations` - list organizations where current user has membership
- `POST /api/v1/organizations` - create organization and assign current user as `OWNER`
- `GET /api/v1/tenant/context` - resolve current tenant context
- `GET /api/v1/tenant/members` - list organization members
- `GET /api/v1/tenant/invitations` - list active invitations for organization
- `POST /api/v1/tenant/invitations` - invite member by email (`OWNER` / `ADMIN`)
- `POST /api/v1/tenant/invitations/accept` - accept invite token and join organization
- `GET /api/v1/tenant/billing/usage` - plan limits + current usage snapshot
- `GET /api/v1/tenant/billing/invoices` - mock invoice history feed for billing page
- `GET/POST/PATCH/DELETE /api/v1/tenant/workspaces`
- `GET/POST/PATCH/DELETE /api/v1/tenant/clients`
- `GET/POST/PATCH/DELETE /api/v1/tenant/projects`
- `GET/POST/PATCH/DELETE /api/v1/tenant/tasks` (`PATCH` supports `expectedVersion` for optimistic concurrency)
- `GET /api/v1/tenant/audit-logs` (plan-gated)

Use `x-organization-id` header for tenant-scoped endpoints when a user belongs to multiple organizations.

## Quality gates

- Lint: `pnpm lint`
- Typecheck: `pnpm typecheck`
- Test: `pnpm test`
- Format check: `pnpm format:check`

## CI

GitHub Actions runs lint, typecheck, and tests on every push/PR.
