# Monitoring API — data-source reference

This document is the contract for the **future NestJS "Monitoring API"** that will
aggregate every self-hosted tool into a single backend endpoint for the admin
panel (`manage.saludlinkusa.com`). **No UI is built yet** — this catalogues, per
tool, exactly how to read its data programmatically.

> Scope note: the CI-based **security scanners** (ZAP/Trivy/Semgrep/Gitleaks/npm
> audit/Dependabot) are documented in [security-scanning.md](security-scanning.md)
> and the **SEO** tools in [seo.md](seo.md); both include their own API/auth
> sections. **PostHog** analytics is in [analytics-posthog.md](analytics-posthog.md).
> This file covers the **self-hosted observability stack** in
> [docker-compose.monitoring.yml](../docker-compose.monitoring.yml).

## Aggregation model

```
                         ┌──────────────────────────────┐
   admin panel  ◄──────► │  Monitoring API (NestJS)      │
   (Medusa admin /       │  - one REST facade            │
    manage.*)            │  - server-side creds only     │
                         │  - no PHI, read-only upstream │
                         └───────────────┬──────────────┘
        ┌───────────────┬───────────────┼───────────────┬───────────────┐
        ▼               ▼               ▼               ▼               ▼
   Prometheus       Grafana        Alertmanager       Loki         Uptime Kuma
  /api/v1/query   /api/*  (SA)     /api/v2/alerts  /loki/api/...  /metrics + status
        │                                                              │
   exporters (node/pg/redis/cadvisor/blackbox) scraped by Prometheus   Bull Board
                                                                    /api/queues
```

**Golden rules for the Monitoring API implementation**
- The API talks to these services **over the internal `monitoring` network**, never
  the public internet. Credentials live in the API's server env (Secrets Manager),
  never in the browser.
- All upstream calls are **read-only**. The API exposes only aggregated,
  PHI-free summaries to the admin UI.
- Cache upstream responses (5–30 s) — Prometheus/Loki queries are relatively
  expensive and the admin panel will poll.

---

## 1. Prometheus

| | |
|---|---|
| **Purpose** | Metrics store + query engine (host, container, Postgres, Redis, blackbox probes). |
| **Base URL (internal)** | `http://prometheus:9090` |
| **Base URL (dev host)** | `http://127.0.0.1:9090` |
| **Auth** | None (network-isolated). Put behind the Monitoring API; never expose publicly. |
| **Permissions** | Read-only HTTP API. |
| **Rate limits** | None enforced; guard with query cost + caching. |

### Key endpoints
- `GET /-/healthy`, `GET /-/ready` — health/readiness.
- `GET /api/v1/query?query=<promql>` — instant vector.
- `GET /api/v1/query_range?query=<promql>&start=&end=&step=` — time series.
- `GET /api/v1/targets` — scrape target health (drives an "all systems" view).
- `GET /api/v1/rules` / `GET /api/v1/alerts` — rule + firing-alert state.

### Example — instant query (are all targets up?)
```bash
curl -s 'http://127.0.0.1:9090/api/v1/query?query=up' | jq '.data.result[] | {job:.metric.job, up:.value[1]}'
```
```json
{ "job": "node",     "up": "1" }
{ "job": "postgres", "up": "1" }
{ "job": "redis",    "up": "1" }
{ "job": "blackbox-http", "up": "1" }
```

### Useful PromQL for the admin panel
| Panel | PromQL |
|---|---|
| Targets down | `count(up == 0)` |
| Site up (per probe) | `probe_success` |
| Site latency (s) | `probe_http_duration_seconds{phase="processing"}` |
| Host CPU busy % | `100 - (avg by (instance)(rate(node_cpu_seconds_total{mode="idle"}[5m]))*100)` |
| Host mem used % | `(1 - node_memory_MemAvailable_bytes/node_memory_MemTotal_bytes)*100` |
| Disk free % | `node_filesystem_avail_bytes/node_filesystem_size_bytes*100` |
| Postgres connections | `sum(pg_stat_activity_count)` |
| Redis mem used | `redis_memory_used_bytes` |
| Container CPU | `rate(container_cpu_usage_seconds_total{name!=""}[5m])` |

---

## 2. Grafana OSS

| | |
|---|---|
| **Purpose** | Dashboards + embedded panels; also a stable API facade over Prometheus/Loki. |
| **Base URL (internal)** | `http://grafana:3000` |
| **Base URL (dev host)** | `http://127.0.0.1:3001` |
| **Auth** | **Service account token** (preferred) → `Authorization: Bearer glsa_...`. Basic auth (admin user/pass) works but avoid for automation. |
| **Permissions** | Create a service account with the **Viewer** role for the Monitoring API. |
| **Rate limits** | None by default. |

### Setup (one-time, server-side)
Admin → Administration → Service accounts → *monitoring-api* (Viewer) → **Add token**.
Store the token in the Monitoring API env (Secrets Manager).

### Key endpoints
- `GET /api/health` — `{"database":"ok","version":"11.x"}`.
- `GET /api/datasources` — enumerate wired datasources (Prometheus, Loki, Alertmanager).
- `POST /api/ds/query` — run datasource queries through Grafana (uniform envelope).
- `GET /api/search?type=dash-db` — list dashboards (for embed links).
- `GET /api/dashboards/uid/saludlink-overview` — the provisioned overview board.

### Example
```bash
curl -s -H "Authorization: Bearer $GRAFANA_SA_TOKEN" http://127.0.0.1:3001/api/health
```
```json
{ "commit": "…", "database": "ok", "version": "11.3.1" }
```

> Embedding: the admin panel can iframe a panel via
> `/d-solo/saludlink-overview/…?panelId=3&from=now-6h&to=now` once anonymous or
> signed embedding is configured — but the default posture is **API-only**, no
> public embed.

---

## 3. Alertmanager

| | |
|---|---|
| **Purpose** | Current + historical alert state and silences. |
| **Base URL (internal)** | `http://alertmanager:9093` |
| **Base URL (dev host)** | `http://127.0.0.1:9093` |
| **Auth** | None (network-isolated). |
| **Permissions** | Read-only for the panel; silences are write (gate behind admin role). |
| **Rate limits** | None. |

### Key endpoints (v2 API)
- `GET /api/v2/status` — cluster + config status.
- `GET /api/v2/alerts` — active alerts (the "what's firing now" feed).
- `GET /api/v2/alerts/groups` — grouped for display.
- `GET /api/v2/silences` / `POST /api/v2/silences` — read/create silences.

### Example
```bash
curl -s http://127.0.0.1:9093/api/v2/alerts | jq '.[] | {name:.labels.alertname, sev:.labels.severity, state:.status.state}'
```
```json
{ "name": "SiteProbeFailing", "sev": "critical", "state": "active" }
```

---

## 4. Loki (logs)

| | |
|---|---|
| **Purpose** | Aggregated container logs (PHI/secret-redacted by Promtail). |
| **Base URL (internal)** | `http://loki:3100` |
| **Base URL (dev host)** | `http://127.0.0.1:3100` |
| **Auth** | None in single-binary mode (`auth_enabled: false`). Network-isolated. |
| **Permissions** | Read-only query for the panel. |
| **Rate limits** | `limits_config` caps query series/labels; tune in [loki-config.yml](../config/loki/loki-config.yml). |

### Key endpoints
- `GET /ready` — readiness.
- `GET /loki/api/v1/query_range?query=<logql>&start=&end=&limit=` — range query.
- `GET /loki/api/v1/labels` and `/label/{name}/values` — label discovery.
- `GET /metrics` — Loki's own Prometheus metrics.

### Example — recent errors from the Medusa backend
```bash
curl -s -G 'http://127.0.0.1:3100/loki/api/v1/query_range' \
  --data-urlencode 'query={compose_project="saludlink"} |= "error"' \
  --data-urlencode 'limit=20' | jq '.data.result | length'
```
```json
7
```

---

## 5. Exporters (scraped by Prometheus — no direct panel calls)

These expose Prometheus text on `/metrics` and are **not published**; the panel
reads their data **through Prometheus** (§1), not directly. Documented here so the
Monitoring API knows which PromQL maps to which source.

| Exporter | Internal target | Sample metrics |
|---|---|---|
| Node Exporter | `node-exporter:9100/metrics` | `node_cpu_seconds_total`, `node_memory_*`, `node_filesystem_*` |
| Postgres Exporter | `postgres-exporter:9187/metrics` | `pg_up`, `pg_stat_activity_count`, `pg_stat_database_*` |
| Redis Exporter | `redis-exporter:9121/metrics` | `redis_up`, `redis_memory_used_bytes`, `redis_connected_clients`, `redis_commands_processed_total` |
| cAdvisor | `cadvisor:8080/metrics` | `container_cpu_usage_seconds_total`, `container_memory_usage_bytes` |
| Blackbox Exporter | `blackbox-exporter:9115/probe?target=…&module=http_2xx` | `probe_success`, `probe_http_duration_seconds`, `probe_ssl_earliest_cert_expiry` |

---

## 6. Uptime Kuma (synthetic uptime + status page)

| | |
|---|---|
| **Purpose** | Human-configured uptime monitors, incident history, public/private status page. |
| **Base URL (internal)** | `http://uptime-kuma:3001` |
| **Base URL (dev host)** | `http://127.0.0.1:3002` |
| **Auth** | UI: username/password (set on first run). **Prometheus metrics**: API key via Settings → API Keys → `Authorization: Basic <base64(:apikey)>`. Status page JSON: public per-slug. |
| **Permissions** | Read-only via metrics + status-page JSON. (Uptime Kuma has **no full REST CRUD API**; automation is Socket.io or the metrics/status endpoints.) |
| **Rate limits** | None enforced. |

### Key endpoints
- `GET /metrics` — Prometheus-format monitor state (`monitor_status`, `monitor_response_time`). Requires an API key.
- `GET /api/status-page/{slug}` — status page config + monitor list (JSON).
- `GET /api/status-page/heartbeat/{slug}` — heartbeat + uptime %/24h/30d per monitor.

### Example — status-page heartbeat
```bash
curl -s http://127.0.0.1:3002/api/status-page/heartbeat/saludlink | jq '.uptimeList'
```
```json
{ "1_24": 1.0, "1_720": 0.9992 }
```

> Recommended: the Monitoring API reads Uptime Kuma's `/metrics` (through
> Prometheus, by adding it as a scrape target with the API key) so uptime data
> lands in the same TSDB as everything else.

---

## 7. Bull Board (BullMQ queues)

| | |
|---|---|
| **Purpose** | Visibility into Medusa v2's Redis-backed queues (event bus, workflow engine, scheduled jobs). |
| **Base URL (internal)** | `http://bull-board:3000` |
| **Base URL (dev host)** | `http://127.0.0.1:3003` |
| **Auth** | Basic auth (`BULL_BOARD_USER` / `BULL_BOARD_PASSWORD`). |
| **Permissions** | Read-only for counts; job ret/clean actions are admin-gated. |
| **Rate limits** | None. |

### Key endpoints
- `GET /api/queues` — every discovered queue with job counts by state
  (`waiting`, `active`, `completed`, `failed`, `delayed`, `paused`).

### Example
```bash
curl -s -u "$BULL_BOARD_USER:$BULL_BOARD_PASSWORD" http://127.0.0.1:3003/api/queues \
  | jq '.queues[] | {name, active:.counts.active, failed:.counts.failed}'
```
```json
{ "name": "event-bus", "active": 0, "failed": 2 }
```

> Alternative for the Monitoring API: read BullMQ queue counts **directly from
> Redis** with the `bullmq` Node client (same Redis the app uses). This avoids a
> dependency on the Bull Board container and keeps the API self-contained. Use
> whichever is simpler at build time; both are documented.

---

## Consolidated summary

| Tool | Auth | Internal base URL | Primary endpoint | Rate limit |
|---|---|---|---|---|
| Prometheus | none (isolated) | `http://prometheus:9090` | `/api/v1/query_range` | none |
| Grafana | SA bearer token | `http://grafana:3000` | `/api/ds/query` | none |
| Alertmanager | none (isolated) | `http://alertmanager:9093` | `/api/v2/alerts` | none |
| Loki | none (isolated) | `http://loki:3100` | `/loki/api/v1/query_range` | config caps |
| Uptime Kuma | API key / basic | `http://uptime-kuma:3001` | `/metrics`, `/api/status-page/*` | none |
| Bull Board | basic auth | `http://bull-board:3000` | `/api/queues` | none |
| PostHog | personal API key | see [analytics-posthog.md](analytics-posthog.md) | `/api/projects/:id/query` | 240/min burst |
| GitHub scanners | GH token | `https://api.github.com` | `/code-scanning/alerts` | 5000/hr |
| Search Console | OAuth2 SA | `https://www.googleapis.com/webmasters/v3` | `searchanalytics.query` | ~1200/min |
| PageSpeed Insights | API key | `https://www.googleapis.com/pagespeedonline/v5` | `runPagespeed` | 25k/day |

**Suggested Monitoring API surface** (single facade the admin panel calls):
```
GET /monitoring/health        → rolls up Prometheus /targets + Grafana/Loki /ready
GET /monitoring/uptime        → Uptime Kuma + blackbox probe_success
GET /monitoring/metrics/:kind → host | db | redis | containers (PromQL behind it)
GET /monitoring/alerts        → Alertmanager active alerts
GET /monitoring/logs          → Loki query_range (redacted, paginated)
GET /monitoring/queues        → Bull Board / BullMQ counts
GET /monitoring/security      → GitHub code-scanning + Dependabot summary
GET /monitoring/seo           → Search Console + PSI + Lighthouse summary
GET /monitoring/analytics     → PostHog privacy-safe aggregates
```
