# Monitoring API (NestJS) — task 27

A **read-only** REST facade that aggregates the self-hosted observability stack
(`infra/monitoring/`) into one backend the admin panel calls, plus a
self-contained admin **Monitoring dashboard** served by the same service. This
implements the contract in
[`infra/monitoring/docs/monitoring-api.md`](../../infra/monitoring/docs/monitoring-api.md).

## Design rules (honoured here)

- **Read-only upstream, PHI-free downstream.** Every handler returns an
  aggregated, PHI-free summary. Log lines are re-redacted in the API
  (`src/common/redact.ts`) on top of Promtail's ingest-time scrubbing.
- **Server-side credentials only.** Upstream URLs + tokens live in the API env;
  the browser never holds a credential. The dashboard calls the same-origin
  facade.
- **Caching.** Upstream responses are cached `CACHE_TTL_SECONDS` (default 10s)
  since the panel polls and Prometheus/Loki queries are relatively expensive.
- **Self-contained.** No dependency on the pnpm workspace — it installs, builds
  and ships on its own (see `Dockerfile`), so it never touches the root lockfile.

## Endpoints

| Route                           | Source                                   | Status                  |
| ------------------------------- | ---------------------------------------- | ----------------------- |
| `GET /healthz`                  | the API itself (liveness)                | live                    |
| `GET /monitoring/health`        | Prometheus `/targets` + Grafana/Loki/AM  | live                    |
| `GET /monitoring/uptime`        | blackbox `probe_success` + Uptime Kuma   | live                    |
| `GET /monitoring/metrics/:kind` | PromQL — `host｜db｜redis｜containers`   | live                    |
| `GET /monitoring/alerts`        | Alertmanager `/api/v2/alerts`            | live                    |
| `GET /monitoring/logs`          | Loki `query_range` (redacted, paginated) | live                    |
| `GET /monitoring/queues`        | Bull Board `/api/queues` (BullMQ)        | live                    |
| `GET /monitoring/security`      | GitHub code-scanning + Dependabot        | **gated** (needs token) |
| `GET /monitoring/seo`           | Search Console + PSI + Lighthouse        | **gated** (needs URL)   |
| `GET /monitoring/analytics`     | PostHog privacy-safe aggregates          | **gated** (needs key)   |
| `GET /` and `GET /dashboard`    | the admin Monitoring UI (HTML)           | live                    |

Gated endpoints return `{ "configured": false, "hint": "..." }` until their
credentials exist — the SaaS tools can't be reached before there is a deployed,
domain-verified URL (plan Phase 4/5).

`/monitoring/logs` query params: `service` (a `compose_service` label), `q`
(a line filter), `limit` (1–1000, default 100), `sinceMinutes` (1–1440, default 60).

`/monitoring/metrics/:kind` accepts `host｜db｜redis｜containers`.

## Auth

Set `MONITORING_API_TOKEN` to require `Authorization: Bearer <token>` (or
`x-api-key`) on every `/monitoring/*` call. Empty in local dev (loopback-only
bind). CORS is closed unless `MONITORING_CORS_ORIGINS` lists the admin origin.

## Run it locally

The observability stack must be up first
(`infra/monitoring/` → `docker compose ... up -d`), publishing its dev-host
ports on 127.0.0.1.

```bash
cd services/monitoring
npm install --ignore-scripts        # isolated; does not touch the workspace
cp .env.template .env                # defaults already point at the dev-host ports
npm run build && npm start           # or: npm run dev  (tsx watch)
# → http://127.0.0.1:3009/           dashboard
# → http://127.0.0.1:3009/monitoring/health
```

Tests (pure logic — redaction, PromQL catalog, aggregation with mocked upstreams):

```bash
npm test
```

## Production shape

One container on the box, on the internal `monitoring` network, reached through
`manage.saludlinkusa.com` behind the admin auth. Set `MONITORING_API_BIND=0.0.0.0`,
point the `*_URL` vars at the internal service names (`http://prometheus:9090`,
`http://loki:3100`, …), and inject `MONITORING_API_TOKEN` + upstream creds from
SSM / Secrets Manager. Never publish this port to the public internet.

The dashboard can also be embedded as a Medusa admin route later (an iframe / link
to `manage.` → this service). That wiring lives in `apps/medusa` and is owned by
the Medusa session, so it is intentionally not added here.
