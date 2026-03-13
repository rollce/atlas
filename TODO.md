# Atlas — Multi-tenant SaaS TODO

Subdomain: `atlas.rollsev.work`
Goal: production-style B2B SaaS to demonstrate multi-tenant architecture, RBAC, billing, jobs, and deployment maturity.

## 0) Product decisions (baseline for implementation)

- [ ] Confirm final scope: "Workspace OS for agencies/SMB teams" (projects, tasks, clients, members, billing)
- [ ] Confirm ICP: service agencies (5-50 people), startup ops teams, small consultancies
- [ ] Confirm 5 primary use cases:
  - [ ] Create organization + invite team
  - [ ] Manage workspaces/projects/tasks
  - [ ] Track clients and delivery status
  - [ ] Control access by role
  - [ ] Upgrade plan when limits reached
- [ ] Confirm monetization: SaaS subscriptions (Free / Pro / Business)
- [ ] Confirm multi-tenancy model: shared DB + `tenant_id`
- [ ] Confirm role model: `owner`, `admin`, `manager`, `member`
- [ ] Confirm MVP boundary vs Post-MVP boundary

## 1) Architecture & design

- [ ] Define domain modules: auth, tenants, orgs, workspaces, projects, tasks, clients, members, billing, audit, files, notifications
- [ ] Design core entities:
  - [ ] `user`
  - [ ] `organization`
  - [ ] `membership`
  - [ ] `workspace`
  - [ ] `project`
  - [ ] `task`
  - [ ] `client`
  - [ ] `invitation`
  - [ ] `subscription`
  - [ ] `audit_log`
  - [ ] `session`
- [ ] Produce ERD (`docs/erd.mmd`, export to PNG)
- [ ] Produce architecture diagram (`docs/architecture.mmd`, export to PNG)
- [ ] Define API style (REST, `/api/v1`, pagination conventions)
- [ ] Define frontend route map (public + app pages)

## 2) Repo bootstrap

- [x] Create repository `atlas`
- [x] Choose monorepo (recommended: `pnpm` + `turbo`)
- [ ] Create structure:
  - [x] `apps/web`
  - [x] `apps/api`
  - [x] `apps/worker`
  - [x] `packages/ui`
  - [x] `packages/config`
- [x] Add `.gitignore`
- [x] Add root `README.md` (overview + run instructions)
- [x] Add `.env.example`
- [x] Add root scripts (`dev`, `build`, `lint`, `test`, `format`, `db:migrate`, `db:seed`)
- [x] Configure ESLint
- [x] Configure Prettier
- [x] Configure Husky + lint-staged
- [x] Configure commit convention (Conventional Commits)
- [x] Add CI workflow (lint + typecheck + tests)

## 3) Backend foundation

- [x] Initialize API service (recommended: NestJS or Fastify)
- [x] Connect PostgreSQL
- [x] Connect ORM (recommended: Prisma)
- [x] Implement initial schema + migrations
- [x] Add seed data script
- [x] Add typed config module
- [x] Add environment validation
- [x] Add structured logging
- [x] Add global error handling middleware/filter
- [x] Add health endpoints: `/health`, `/ready`
- [x] Add versioned routes: `/api/v1/*`

## 4) Auth & sessions

- [x] Registration
- [x] Login
- [x] Refresh token flow
- [x] Logout
- [x] Email verification (mock allowed for MVP)
- [x] Forgot password
- [x] Reset password
- [x] Session/device tracking
- [x] Refresh token rotation
- [x] Basic brute-force protection
- [x] Hash passwords + hash refresh tokens

## 5) Tenancy & RBAC

- [x] Implement tenant resolver middleware
- [ ] Enforce tenant isolation in all tenant-bound queries
- [x] Implement membership model
- [x] Invite by email flow
- [x] Join organization flow
- [x] Organization/workspace switcher support
- [x] Define permissions matrix per role
- [x] Implement RBAC guards in API
- [ ] Add policy layer for resource-level checks
- [ ] Mirror permission checks in UI

## 6) Core domain features

- [ ] CRUD organizations
- [ ] CRUD workspaces
- [ ] CRUD projects
- [ ] CRUD tasks
- [ ] CRUD clients
- [ ] Task statuses and workflow
- [ ] Filters, sorting, full-text/basic search
- [ ] Assignees and due dates
- [ ] Activity history timeline
- [ ] Comments on tasks/projects
- [ ] File attachments
- [ ] Audit log on critical actions
- [ ] Soft delete where needed
- [ ] Pagination on all list endpoints
- [ ] Optimistic concurrency (version field) on critical entities

## 7) Billing & subscription architecture

- [x] Define plans model (Free / Pro / Business)
- [x] Define subscriptions model
- [ ] Implement feature gates
- [ ] Implement usage limits (projects, members, storage)
- [ ] Add middleware for limit checks
- [x] Add trial period logic
- [x] Build billing page (plan + usage + invoices)
- [ ] Build upgrade/downgrade flow
- [ ] Add mock checkout (MVP) with Stripe-ready abstraction
- [ ] Add webhook endpoint for billing events
- [ ] Store invoice/history records

## 8) Background jobs & workers

- [x] Connect Redis
- [x] Initialize worker service
- [ ] Configure queues:
  - [x] Email sending
  - [x] Invitation sending
  - [x] Audit/event processing
  - [x] Report generation
  - [x] Cleanup tasks
- [ ] Add retries policy
- [ ] Add simplified dead-letter queue handling
- [x] Add job status logging
- [ ] Add idempotency key for sensitive async operations

## 9) Frontend (web)

### Public pages

- [x] Landing
- [x] Pricing
- [x] Login
- [x] Signup
- [x] Forgot password
- [x] Reset password

### App pages

- [x] Dashboard
- [x] Organizations
- [x] Workspace switcher view
- [x] Projects list
- [x] Project details
- [x] Tasks board + table
- [x] Clients
- [x] Members + invitations
- [x] Billing + settings
- [x] Audit logs
- [x] Profile + settings

### UI/UX quality

- [x] App layout shell (sidebar/topbar/content)
- [x] Protected routes
- [ ] Auth store/session bootstrap
- [x] Tenant switcher UX
- [ ] Tables with filtering/sorting/pagination state
- [x] Forms with schema validation
- [x] Toast notifications
- [ ] Skeleton loaders
- [ ] Empty states
- [ ] Error states
- [ ] Optimistic updates where useful

## 10) Security baseline

- [x] Input validation on all endpoints
- [ ] Output sanitization where user content is rendered
- [x] CORS policy for prod + local
- [x] Secure headers
- [ ] API rate limiting
- [ ] CSRF strategy (if cookie auth)
- [ ] File upload restrictions
- [ ] Max file size limits
- [ ] MIME type validation
- [ ] Audit auth-related events
- [ ] Protect admin-only endpoints
- [ ] Add checks to prevent tenant data leakage

## 11) Tests

- [ ] Unit tests for core services
- [x] Integration tests for auth
- [ ] Integration tests for tenant isolation
- [ ] Integration tests for RBAC
- [x] API tests for critical business flows
- [ ] Smoke tests for deployments
- [ ] Seed test fixtures
- [ ] Basic E2E:
  - [ ] Signup
  - [ ] Create organization
  - [ ] Invite member
  - [ ] Create project
  - [ ] Create task

## 12) Observability

- [x] Request logging
- [x] Error logging
- [x] Correlation ID across API + worker
- [ ] Basic metrics (RPS, error rate, queue lag)
- [ ] Uptime monitor
- [ ] Audit log viewer in app
- [ ] Railway logs review checklist
- [ ] Alert channel (Telegram/Discord webhook)

## 13) Docker & local dev

- [x] Dockerfile for `apps/web`
- [x] Dockerfile for `apps/api`
- [x] Dockerfile for `apps/worker`
- [x] `docker-compose.yml` for local dev stack
- [x] Local PostgreSQL + Redis services
- [x] Startup scripts
- [x] Migration-on-boot strategy
- [x] Document "Run locally" in README

## 14) Railway deployment

- [x] Create Railway project: `atlas`
- [x] Create services: `web`, `api`, `worker`
- [x] Add PostgreSQL service
- [x] Add Redis service
- [x] Configure env variables per service
- [x] Configure build/start commands
- [x] Configure healthchecks
- [x] Run prod migrations
- [ ] Load seed/demo data
- [x] Verify service-to-service networking
- [x] Verify production logs
- [x] Verify CORS on production URLs
- [ ] Verify file upload/storage on production

## 15) Domain setup (`atlas.rollsev.work`)

- [ ] Add DNS record for `atlas.rollsev.work` -> frontend service target
- [ ] Add DNS record for `api.atlas.rollsev.work` -> API service target
- [x] Add custom domains in Railway (`atlas` + `api.atlas`)
- [ ] Wait for SSL certificate issuance
- [x] Set `NEXT_PUBLIC_APP_URL=https://atlas.rollsev.work`
- [x] Set `API_BASE_URL=https://api.atlas.rollsev.work/api/v1`
- [ ] Verify cookie/auth domain settings
- [ ] Verify OAuth/redirect/callback URLs (if enabled)
- [ ] Run domain smoke test checklist

## 16) Portfolio finish

- [ ] Final README sections:
  - [ ] Overview
  - [ ] Feature list
  - [ ] Architecture
  - [ ] Stack
  - [ ] Local setup
  - [ ] Production link
  - [ ] Screenshots
- [ ] Record demo video
- [ ] Export architecture diagram PNG
- [ ] Export ERD PNG
- [ ] Prepare 1-2 demo users
- [ ] Write "What I learned"
- [ ] Write "Scaling ideas"

---

## MVP definition (must-have before public showcase)

- [ ] Auth + sessions
- [ ] Multi-tenant isolation + RBAC
- [ ] Organizations/workspaces/projects/tasks/clients CRUD
- [ ] Invite flow + membership management
- [ ] Audit logs (basic)
- [ ] Billing architecture with mock checkout + limits
- [ ] Worker with email + audit jobs
- [ ] Production deploy on Railway with domain + SSL
- [ ] Clean README + diagrams + demo seed

## Post-MVP (after first showcase)

- [ ] Real Stripe integration
- [ ] Real email provider + templates
- [ ] Advanced analytics dashboard
- [ ] SSO/SAML
- [ ] Object storage for files (S3-compatible)
- [ ] Webhooks for external integrations
- [ ] Advanced permissions editor
