FROM node:22-alpine AS base
WORKDIR /app
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-workspace.yaml turbo.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/ui/package.json packages/ui/package.json
COPY packages/config/package.json packages/config/package.json
RUN pnpm install --filter @atlas/web... --frozen-lockfile=false

FROM deps AS builder
COPY . .
RUN pnpm --filter @atlas/web build

FROM base AS runner
ENV NODE_ENV=production
COPY --from=builder /app /app
EXPOSE 3000
CMD ["sh", "/app/scripts/start-web.sh"]
