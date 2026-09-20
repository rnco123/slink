# syntax=docker/dockerfile:1
#
# Storefront (Next.js 15, standalone output) — production image.
# Build context MUST be the repo ROOT (pnpm workspace + lockfile + workspace
# packages live there):
#   docker build -f storefront/Dockerfile \
#     --build-arg NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=pk_... \
#     --build-arg NEXT_PUBLIC_MEDUSA_BACKEND_URL=https://manage.saludlinkusa.com \
#     --build-arg NEXT_PUBLIC_BASE_URL=https://saludlinkusa.com \
#     -t saludlink/storefront .
#
# NOTE: NEXT_PUBLIC_* are baked into the client bundle at BUILD time, so they are
# build args, not runtime env. Server-only secrets stay runtime env.

FROM node:22-alpine AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH NEXT_TELEMETRY_DISABLED=1
RUN corepack enable
WORKDIR /app

# ---- deps: install workspace deps against the frozen lockfile -----------------
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc turbo.json ./
COPY storefront/package.json ./storefront/
COPY packages/ui/package.json ./packages/ui/
COPY packages/privacy/package.json ./packages/privacy/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

# ---- build: compile the standalone server ------------------------------------
FROM deps AS build
# check-env-variables.js requires this at build time (exits 1 if missing).
ARG NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_MEDUSA_BACKEND_URL
ARG NEXT_PUBLIC_BASE_URL
# NEXT_PUBLIC_* are inlined into the browser bundle at BUILD time, so every one
# the deploy workflow passes needs an ARG here — a build-arg with no matching
# ARG is silently discarded, and the var reaches the bundle as undefined.
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=$NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY \
    NEXT_PUBLIC_MEDUSA_BACKEND_URL=$NEXT_PUBLIC_MEDUSA_BACKEND_URL \
    NEXT_PUBLIC_BASE_URL=$NEXT_PUBLIC_BASE_URL \
    NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY \
    NODE_ENV=production
COPY storefront ./storefront
COPY packages/ui ./packages/ui
COPY packages/privacy ./packages/privacy
RUN pnpm --filter @saludlink/storefront build

# ---- runner: minimal standalone runtime --------------------------------------
FROM base AS runner
ENV NODE_ENV=production PORT=8000 HOSTNAME=0.0.0.0
RUN addgroup -S nodejs -g 1001 && adduser -S nextjs -u 1001
WORKDIR /app

# Standalone bundle preserves the monorepo layout, so the entry is
# storefront/server.js and static/public sit beside it.
COPY --from=build --chown=nextjs:nodejs /app/storefront/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/storefront/.next/static ./storefront/.next/static
COPY --from=build --chown=nextjs:nodejs /app/storefront/public ./storefront/public

USER nextjs
EXPOSE 8000
# Container-native healthcheck hits the dependency-free /api/health route (task 48).
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:8000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "storefront/server.js"]
