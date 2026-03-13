FROM node:22-alpine AS base
WORKDIR /app
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/config/package.json packages/config/package.json
RUN pnpm install --filter @atlas/api... --frozen-lockfile=false

FROM deps AS builder
COPY . .
RUN pnpm --filter @atlas/api build

FROM base AS runner
ENV NODE_ENV=production
COPY --from=builder /app /app
EXPOSE 4000
CMD ["sh", "/app/scripts/start-api.sh"]
