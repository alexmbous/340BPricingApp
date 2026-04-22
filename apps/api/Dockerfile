# syntax=docker/dockerfile:1.7
# Multi-stage build for the NestJS API.
# Produces a small, non-root image deployable to AWS Fargate behind an ALB.

# ─── Stage 1: install deps at the workspace root ─────────────
FROM node:20.11.0-alpine AS deps
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
WORKDIR /workspace

# Copy only manifests to maximize layer cache
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY packages/shared-types/package.json ./packages/shared-types/package.json
COPY packages/providers-contracts/package.json ./packages/providers-contracts/package.json
COPY packages/api-client/package.json ./packages/api-client/package.json

RUN pnpm install --frozen-lockfile

# ─── Stage 2: build ──────────────────────────────────────────
FROM node:20.11.0-alpine AS build
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
WORKDIR /workspace

COPY --from=deps /workspace/node_modules ./node_modules
COPY --from=deps /workspace/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /workspace/packages ./packages
COPY . .

RUN pnpm --filter @apexcare/api exec prisma generate \
 && pnpm --filter @apexcare/shared-types build \
 && pnpm --filter @apexcare/providers-contracts build \
 && pnpm --filter @apexcare/api build

# Prune dev deps for runtime stage
RUN pnpm --filter @apexcare/api deploy --prod /opt/api-runtime

# Prisma engine + migrations need to travel with the app
RUN cp -R apps/api/prisma /opt/api-runtime/prisma

# ─── Stage 3: runtime ────────────────────────────────────────
FROM node:20.11.0-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

# non-root user
RUN addgroup -S api && adduser -S api -G api
RUN apk add --no-cache curl openssl

COPY --from=build --chown=api:api /opt/api-runtime /app

USER api
EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD curl -fs http://127.0.0.1:4000/v1/health/ready || exit 1

# Migrate then start. On Fargate, prefer running migrations as a one-off
# task — gate this behind RUN_MIGRATIONS=true if you want it in-container.
CMD ["sh", "-c", "if [ \"$RUN_MIGRATIONS\" = \"true\" ]; then node node_modules/prisma/build/index.js migrate deploy; fi; node dist/main.js"]
