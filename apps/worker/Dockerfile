FROM node:22-alpine AS base
WORKDIR /app
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-workspace.yaml turbo.json ./
COPY apps/worker/package.json apps/worker/package.json
COPY packages/config/package.json packages/config/package.json
RUN pnpm install --filter @atlas/worker... --frozen-lockfile=false

FROM deps AS builder
COPY . .
RUN pnpm --filter @atlas/worker build

FROM base AS runner
ENV NODE_ENV=production
COPY --from=builder /app /app
CMD ["sh", "/app/scripts/start-worker.sh"]
