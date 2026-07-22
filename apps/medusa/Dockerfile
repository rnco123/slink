# syntax=docker/dockerfile:1
#
# Medusa v2 commerce backend — production image (serves BOTH the API/admin and
# the background worker; role is chosen at runtime via MEDUSA_WORKER_MODE).
# Build context MUST be the repo ROOT:
#   docker build -f apps/medusa/Dockerfile -t saludlink/medusa .
#
# One image, three run modes (compose picks per service):
#   - server:    MEDUSA_WORKER_MODE=server   (HTTP API + admin dashboard)
#   - worker:    MEDUSA_WORKER_MODE=worker   (jobs/subscribers/scheduled tasks)
#   - migration: command override -> `npx medusa db:migrate` (one-shot, then exits)
#
# `medusa build` emits a self-contained server at apps/medusa/.medusa/server
# with its OWN package.json, so the runner installs prod deps inside that dir.

FROM node:22-slim AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN corepack enable
WORKDIR /app

# ---- deps --------------------------------------------------------------------
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc turbo.json ./
COPY apps/medusa/package.json ./apps/medusa/
COPY packages/privacy/package.json ./packages/privacy/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

# ---- build: produce .medusa/server -------------------------------------------
FROM deps AS build
ENV NODE_ENV=production
COPY apps/medusa ./apps/medusa
COPY packages/privacy ./packages/privacy
RUN pnpm --filter @saludlink/medusa build

# ---- runner: run the compiled server dir -------------------------------------
FROM base AS runner
ENV NODE_ENV=production PORT=9000
RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd -r medusa && useradd -r -g medusa medusa
WORKDIR /app/server

# The built server is self-contained; install ONLY its production deps.
COPY --from=build --chown=medusa:medusa /app/apps/medusa/.medusa/server ./
RUN --mount=type=cache,id=npm,target=/root/.npm \
    npm install --omit=dev \
    && chown -R medusa:medusa /app/server

USER medusa
EXPOSE 9000
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=5 \
  CMD curl -fsS http://127.0.0.1:9000/health || exit 1

# Default: run the HTTP server. Compose sets MEDUSA_WORKER_MODE per service and
# overrides the command to `npm run start:migrate` for the migration one-shot.
CMD ["npm", "run", "start"]
