FROM node:22-alpine AS base
WORKDIR /app
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/config/package.json packages/config/package.json
RUN pnpm install --filter @atlas/web... --frozen-lockfile=false

FROM deps AS builder
COPY apps/web apps/web
COPY packages/config packages/config
RUN pnpm --filter @atlas/web build

FROM busybox:1.36.1 AS runner
WORKDIR /site
COPY --from=builder /app/apps/web/dist ./
EXPOSE 3000
CMD ["sh", "-c", "httpd -f -p ${PORT:-3000} -h /site"]
