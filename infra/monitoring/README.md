# Saludlink — Monitoring & Observability Stack

Self-hosted metrics, logs, uptime, queue, security, SEO and analytics tooling for
the Saludlink platform. Everything here is **production-ready, modular, env-driven,
and PHI-free**. It is designed to be aggregated later by a single **Monitoring API
(NestJS)** for the admin panel — see [docs/monitoring-api.md](docs/monitoring-api.md).

> **Do not build the admin Monitoring UI yet.** This layer installs, configures,
> verifies and documents the underlying tools. Dashboard work comes after.

---

## Contents

| Path | What |
|---|---|
| [docker-compose.monitoring.yml](docker-compose.monitoring.yml) | The observability stack (Prometheus, Grafana, Loki, exporters, Uptime Kuma, Bull Board…). |
| [.env.monitoring.template](.env.monitoring.template) | All environment variables (copy to `.env`). |
| [config/](config/) | Per-service config (prometheus, alertmanager, blackbox, loki, promtail, grafana provisioning). |
| [docs/monitoring-api.md](docs/monitoring-api.md) | Per-tool auth, base URLs, endpoints, examples, rate limits for the future Monitoring API. |
| [docs/security-scanning.md](docs/security-scanning.md) | ZAP, Trivy, Semgrep, Gitleaks, npm audit, Dependabot. |
| [docs/seo.md](docs/seo.md) | Search Console, Merchant Center, Bing, Lighthouse CI, PageSpeed Insights, Screaming Frog. |
| [docs/analytics-posthog.md](docs/analytics-posthog.md) | Existing privacy-safe PostHog config + Monitoring API surface. |
| [TASK.md](TASK.md) | Live progress tracker + completion %. |

CI-based tooling lives at repo root: [.github/workflows/security.yml](../../.github/workflows/security.yml),
[dast-zap.yml](../../.github/workflows/dast-zap.yml),
[lighthouse.yml](../../.github/workflows/lighthouse.yml),
[.github/dependabot.yml](../../.github/dependabot.yml).

---

## Architecture

```
apps (storefront :8000, medusa :9000)  ─ probed by ─►  Blackbox / Uptime Kuma
        │                                                     │
   Postgres :5432 ─► postgres-exporter ┐                      │
   Redis    :6379 ─► redis-exporter    ├─► Prometheus ─► Grafana ◄─ Loki ◄─ Promtail
   host           ─► node-exporter     │        │                          (container logs,
   containers     ─► cAdvisor          ┘        ▼                           PHI/secret-redacted)
                                          Alertmanager ─► Slack/email
   Redis (BullMQ) ─► Bull Board

Networks:  monitoring (internal)  +  saludlink_default (external, app DB/Redis)
```

The stack attaches to the app's existing Docker network (`saludlink_default`,
created by [../../docker-compose.yml](../../docker-compose.yml)) so the exporters
reach Postgres/Redis **by service name without opening new host ports**.

---

## Quick start (dev)

```bash
# 0. The app stack must be up (creates the shared network + DB/Redis):
docker compose -f ../../docker-compose.yml up -d

# 1. Configure:
cd infra/monitoring
cp .env.monitoring.template .env      # then edit passwords

# 2. Boot:
docker compose -f docker-compose.monitoring.yml --env-file .env up -d

# 3. Verify (see Health checks below), then open:
#    Grafana      http://127.0.0.1:3001   (admin / GRAFANA_ADMIN_PASSWORD)
#    Uptime Kuma  http://127.0.0.1:3002   (set admin on first load)
#    Bull Board   http://127.0.0.1:3003   (BULL_BOARD_USER / _PASSWORD)
#    Prometheus   http://127.0.0.1:9090   (dev only; internal in prod)
#    Alertmanager http://127.0.0.1:9093   (dev only; internal in prod)
```

Validate config without booting:
```bash
docker compose -f docker-compose.monitoring.yml --env-file .env config >/dev/null && echo OK
```

---

## Docker services & ports

| Service | Image | Container port | Dev host bind | Published in prod? | Persistent volume |
|---|---|---|---|---|---|
| prometheus | prom/prometheus:v2.55.1 | 9090 | `127.0.0.1:9090` | **No** (internal) | `prometheus_data` |
| alertmanager | prom/alertmanager:v0.27.0 | 9093 | `127.0.0.1:9093` | **No** (internal) | `alertmanager_data` |
| grafana | grafana/grafana-oss:11.3.1 | 3000 | `127.0.0.1:3001` | via admin subdomain + auth | `grafana_data` |
| node-exporter | prom/node-exporter:v1.8.2 | 9100 | — | No | — |
| postgres-exporter | prometheuscommunity/postgres-exporter:v0.16.0 | 9187 | — | No | — |
| redis-exporter | oliver006/redis_exporter:v1.66.0 | 9121 | — | No | — |
| cadvisor | cadvisor:v0.49.1 | 8080 | — | No | — |
| blackbox-exporter | prom/blackbox-exporter:v0.25.0 | 9115 | — | No | — |
| loki | grafana/loki:3.2.1 | 3100 | `127.0.0.1:3100` | **No** (internal) | `loki_data` |
| promtail | grafana/promtail:3.2.1 | 9080 | — | No | — |
| uptime-kuma | louislam/uptime-kuma:1.23.16 | 3001 | `127.0.0.1:3002` | via admin subdomain + auth | `uptimekuma_data` |
| bull-board | deadly0/bull-board:3.2.6 | 3000 | `127.0.0.1:3003` | via admin subdomain + auth | — |

**Exposure policy:** only the three admin UIs (Grafana, Uptime Kuma, Bull Board)
are meant to be reachable, and only via `manage.saludlinkusa.com` behind
auth + WAF/IP allow-list. Exporters, Prometheus, Alertmanager and Loki are
**internal-only** — Prometheus scrapes exporters over the `monitoring` network.

---

## Environment variables

All in [.env.monitoring.template](.env.monitoring.template). Highlights:

| Var | Purpose | Prod guidance |
|---|---|---|
| `MONITORING_ENV` | dev / staging / production label | set per env |
| `BIND_ADDR` | host bind for published ports | keep `127.0.0.1`; drop published ports entirely in prod |
| `APP_NETWORK` | app's docker network name | match compose project |
| `PG_EXPORTER_DSN` | Postgres exporter connection | **read-only monitoring role**, TLS, from Secrets Manager |
| `REDIS_EXPORTER_ADDR` | Redis exporter target | + `REDIS_EXPORTER_PASSWORD` |
| `GRAFANA_ADMIN_PASSWORD` | Grafana admin | Secrets Manager; rotate |
| `BULL_BOARD_USER/PASSWORD` | Bull Board basic auth | Secrets Manager |
| `PROMETHEUS_RETENTION` / `LOKI_RETENTION_HOURS` | data retention | size to disk + compliance |
| `ALERT_SLACK_WEBHOOK_URL` / `ALERT_EMAIL_TO` | alert delivery | Secrets Manager |
| `BLACKBOX_TARGETS` | probed URLs | staging/prod public URLs |

**Secrets never live in git.** Templates carry safe local placeholders only
(`change_me_*`), which are allow-listed in [.gitleaks.toml](../../.gitleaks.toml).

---

## Staging & production

- **development** — everything on one host, UIs on `127.0.0.1`, in-memory rings,
  filesystem storage.
- **staging / production** — set `MONITORING_ENV`, **remove the `ports:` publish**
  for every service and route the three admin UIs through
  `manage.saludlinkusa.com` (reverse proxy + auth + WAF). Point exporters at RDS
  Postgres / ElastiCache Redis with **read-only** creds and TLS. For large log
  volume, switch Loki's storage to **S3** (edit [config/loki/loki-config.yml](config/loki/loki-config.yml)
  `storage_config` → `aws`). Deliver alerts to the on-call Slack + SES email.
  Back Prometheus with a bigger EBS volume sized to `PROMETHEUS_RETENTION`.

---

## Health checks

Compose healthchecks are defined for prometheus, alertmanager, grafana, loki and
uptime-kuma. Manual verification:

```bash
# container status
docker compose -f docker-compose.monitoring.yml ps

# component health
curl -s http://127.0.0.1:9090/-/healthy                 # Prometheus  → Prometheus is Healthy.
curl -s http://127.0.0.1:9093/-/healthy                 # Alertmanager
curl -s http://127.0.0.1:3001/api/health | jq .database # Grafana     → "ok"
curl -s http://127.0.0.1:3100/ready                     # Loki        → ready

# are all scrape targets up?
curl -s 'http://127.0.0.1:9090/api/v1/query?query=up' | jq '.data.result[] | {job:.metric.job, up:.value[1]}'

# is the app being probed?
curl -s 'http://127.0.0.1:9090/api/v1/query?query=probe_success' | jq '.data.result'
```

Expected `up` jobs: `prometheus, node, cadvisor, postgres, redis, grafana, loki,
blackbox-http`.

---

## Backup

Data lives in named Docker volumes. Grafana + Uptime Kuma hold the most
irreplaceable state (dashboards, monitors, incident history).

```bash
# Back up a volume to a tarball (repeat per volume):
docker run --rm \
  -v saludlink-monitoring_grafana_data:/data \
  -v "$PWD/backups:/backup" alpine \
  tar czf /backup/grafana_data_$(date +%F).tar.gz -C /data .

# Volumes worth backing up:
#   saludlink-monitoring_grafana_data
#   saludlink-monitoring_uptimekuma_data
#   saludlink-monitoring_prometheus_data   (metrics history — optional)
#   saludlink-monitoring_loki_data         (logs — retention-bound)
#   saludlink-monitoring_alertmanager_data (silences)
```
Config (this directory) is version-controlled — that **is** its backup.
In production, snapshot the underlying EBS volumes on a schedule instead.

## Restore

```bash
docker compose -f docker-compose.monitoring.yml down       # keep volumes
docker volume create saludlink-monitoring_grafana_data
docker run --rm \
  -v saludlink-monitoring_grafana_data:/data \
  -v "$PWD/backups:/backup" alpine \
  sh -c "cd /data && tar xzf /backup/grafana_data_YYYY-MM-DD.tar.gz"
docker compose -f docker-compose.monitoring.yml --env-file .env up -d
```

## Upgrade

Image tags are **pinned** in the compose file (no `:latest`) so upgrades are
deliberate and reviewable; Dependabot's `docker` ecosystem opens PRs for new tags.

```bash
# 1. Bump the tag in docker-compose.monitoring.yml (or merge the Dependabot PR).
# 2. Pull + recreate only what changed:
docker compose -f docker-compose.monitoring.yml --env-file .env pull
docker compose -f docker-compose.monitoring.yml --env-file .env up -d
# 3. Re-verify health (above). Roll back by reverting the tag + up -d.
```
Read release notes for Prometheus (TSDB format), Loki (schema `v13`) and Grafana
(plugin/db migrations) before major bumps. Volumes persist across upgrades.

---

## Security & privacy posture

- **No PHI** is collected anywhere in this stack. Metrics are numeric; logs are
  redacted by Promtail ([config/promtail/promtail-config.yml](config/promtail/promtail-config.yml))
  as defence-in-depth (emails, SSNs, tokens, secrets scrubbed) on top of the app's
  own `@saludlink/privacy` guarantees.
- **No request bodies** are stored — Promtail ships stdout/stderr only, and the app
  must not log bodies.
- **No secrets in logs or git** — Gitleaks + Trivy secret scanning in CI; templates
  carry placeholders only.
- **Admin-only** — no service is public; UIs sit behind the admin subdomain +
  auth. Exporters/Prometheus/Loki are network-internal.
- **No phone-home** — Grafana + Loki usage reporting disabled; PostHog/Semgrep
  telemetry off.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| `postgres`/`redis` targets `up=0` | App stack not running, or `APP_NETWORK` wrong. `docker network ls` and confirm `saludlink_default` exists; check `PG_EXPORTER_DSN`. |
| `blackbox-http` `up=0` | App not running on :8000/:9000, or `host.docker.internal` unresolved on Linux (the compose sets `host-gateway`). |
| Grafana "datasource not found" | Provisioning volume not mounted; confirm [config/grafana/provisioning](config/grafana/provisioning) path. |
| cAdvisor crash-looping on Windows | Docker Desktop/WSL2 quirk — cAdvisor needs the standard host mounts; it may report a subset of metrics on Windows. Non-fatal for the rest of the stack. |
| Bull Board shows no queues | Medusa hasn't created BullMQ queues yet (needs Redis-backed event bus running + activity), or `BULL_PREFIX` mismatch. |
