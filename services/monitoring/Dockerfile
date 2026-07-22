# =============================================================================
# Monitoring API (NestJS) — production image
# Build context = this directory (services/monitoring). Self-contained: it does
# NOT depend on the pnpm workspace, so it builds standalone in CI or on the box.
# =============================================================================

# ---- deps: install production deps only -------------------------------------
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json ./
# No committed lockfile (isolated install); resolve at build time.
RUN npm install --omit=dev --no-audit --no-fund

# ---- build: full deps + tsc -> dist -----------------------------------------
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json ./
RUN npm install --no-audit --no-fund
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build

# ---- runner: minimal runtime ------------------------------------------------
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# Drop root.
RUN addgroup -S app && adduser -S app -G app
COPY --from=deps  /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
USER app
EXPOSE 3009
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.MONITORING_API_PORT||3009)+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/main.js"]
