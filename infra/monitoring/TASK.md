# Monitoring Stack Integration — Progress Tracker

Living status for the "integrate all monitoring/observability/logging/analytics/
SEO/security tools" task. Updated continuously. Legend: ☑ done · ◐ in progress ·
☐ not started.

**Overall completion: LIVE (self-hosted stack) — 2026-07-23.** All tools
integrated, configured, documented, and **now booted & verified locally**. The
prior Docker Desktop network fault is resolved (daemon 29.6.2 healthy). Remaining
open items are SaaS/DAST tools (ZAP/PSI/Search Console) that need a deployed,
domain-verified URL + credentials — Phase 4/5, post-launch.

_Last updated: 2026-07-23._

> ✅ **Boot status (2026-07-23):** stack UP — 12 containers. Prometheus **9/9
> targets up**; Grafana(11.3.1)/Loki/Alertmanager healthy; Loki ingesting all 14
> containers via Promtail; `pg_up=1`, `redis_up=1`. Boot with the Windows dev
> override on Docker Desktop/WSL2 (node-exporter `rslave` mount fix):
> `docker compose -f docker-compose.monitoring.yml -f docker-compose.monitoring.windows.yml --env-file .env up -d`
> (base compose is unchanged and correct for the Linux staging/prod hosts).
>
> ✅ **Task 27 (Monitoring API) + Task 28 (exporter read-only role) DONE** — see
> below and `completion.md` UPDATE 12.

---

## Infrastructure (self-hosted, Docker Compose)

| Tool                | Status | Configured                             | Verified                   | Docs                                                             | Modified/created files            |
| ------------------- | ------ | -------------------------------------- | -------------------------- | ---------------------------------------------------------------- | --------------------------------- |
| Grafana OSS         | ☑      | ✅ provisioned datasources + dashboard | cfg-valid, boot pending¹   | [README](README.md), [api](docs/monitoring-api.md#2-grafana-oss) | compose, `config/grafana/**`      |
| Prometheus          | ☑      | ✅ scrape + alert rules                | cfg-valid, boot pending¹   | [api](docs/monitoring-api.md#1-prometheus)                       | compose, `config/prometheus/**`   |
| Alertmanager        | ☑      | ✅ routing + inhibit                   | cfg-valid, boot pending¹   | [api](docs/monitoring-api.md#3-alertmanager)                     | compose, `config/alertmanager/**` |
| Node Exporter       | ☑      | ✅                                     | cfg-valid, scrape pending¹ | [api](docs/monitoring-api.md#5-exporters)                        | compose                           |
| PostgreSQL Exporter | ☑      | ✅ app DB via shared net               | cfg-valid, scrape pending¹ | [api](docs/monitoring-api.md#5-exporters)                        | compose, `.env` DSN               |
| Redis Exporter      | ☑      | ✅ app Redis via shared net            | cfg-valid, scrape pending¹ | [api](docs/monitoring-api.md#5-exporters)                        | compose, `.env`                   |
| cAdvisor            | ☑      | ✅ (Windows caveat noted)              | cfg-valid, scrape pending¹ | [api](docs/monitoring-api.md#5-exporters)                        | compose                           |

## Website monitoring

| Tool              | Status | Configured                           | Verified                   | Docs                                                                      | Files                                                             |
| ----------------- | ------ | ------------------------------------ | -------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Uptime Kuma       | ☑      | ✅ (monitors set in UI on first run) | cfg-valid, boot pending¹   | [api](docs/monitoring-api.md#6-uptime-kuma-synthetic-uptime--status-page) | compose                                                           |
| Blackbox Exporter | ☑      | ✅ http/tcp/icmp modules + probe job | cfg-valid, scrape pending¹ | [api](docs/monitoring-api.md#5-exporters)                                 | compose, `config/blackbox/**`, `config/prometheus/prometheus.yml` |

## Logging

| Tool         | Status | Configured                              | Verified                 | Docs                                          | Files                         |
| ------------ | ------ | --------------------------------------- | ------------------------ | --------------------------------------------- | ----------------------------- |
| Grafana Loki | ☑      | ✅ single-binary, retention, filesystem | cfg-valid, boot pending¹ | [api](docs/monitoring-api.md#4-loki-logs)     | compose, `config/loki/**`     |
| Promtail     | ☑      | ✅ Docker SD + PHI/secret redaction     | cfg-valid, boot pending¹ | [README](README.md#security--privacy-posture) | compose, `config/promtail/**` |

## Queue

| Tool                | Status | Configured                         | Verified                 | Docs                                                     | Files   |
| ------------------- | ------ | ---------------------------------- | ------------------------ | -------------------------------------------------------- | ------- |
| Bull Board (BullMQ) | ☑      | ✅ points at app Redis, basic-auth | cfg-valid, boot pending¹ | [api](docs/monitoring-api.md#7-bull-board-bullmq-queues) | compose |

## Analytics

| Tool                   | Status | Configured                                | Verified | Docs                                           | Files    |
| ---------------------- | ------ | ----------------------------------------- | -------- | ---------------------------------------------- | -------- |
| PostHog (privacy-safe) | ☑      | ✅ existing config documented (unchanged) | existing | [analytics-posthog](docs/analytics-posthog.md) · [dashboards+UTM (t65)](docs/analytics-dashboards.md) | doc only |

## Security

| Tool              | Status | Configured                             | Verified            | Docs                             | Files                                              |
| ----------------- | ------ | -------------------------------------- | ------------------- | -------------------------------- | -------------------------------------------------- |
| Gitleaks          | ☑      | ✅ CI job + `.gitleaks.toml` allowlist | runs on PR/push     | [sec](docs/security-scanning.md) | `.github/workflows/security.yml`, `.gitleaks.toml` |
| Trivy             | ☑      | ✅ fs vuln+secret+misconfig, SARIF     | runs on PR/push     | [sec](docs/security-scanning.md) | `.github/workflows/security.yml`                   |
| Semgrep CE        | ☑      | ✅ OWASP/TS/Next rulesets, SARIF       | runs on PR/push     | [sec](docs/security-scanning.md) | `.github/workflows/security.yml`                   |
| npm audit         | ☑      | ✅ high-fails + JSON artifact          | runs on PR/push     | [sec](docs/security-scanning.md) | `.github/workflows/security.yml`                   |
| GitHub Dependabot | ☑      | ✅ npm+actions+docker ecosystems       | active on merge     | [sec](docs/security-scanning.md) | `.github/dependabot.yml`                           |
| OWASP ZAP         | ◐      | ✅ baseline workflow + rules.tsv       | ☐ needs staging URL | [sec](docs/security-scanning.md) | `.github/workflows/dast-zap.yml`, `.zap/rules.tsv` |

## SEO

| Tool                   | Status | Configured                         | Verified                       | Docs               | Files                                                   |
| ---------------------- | ------ | ---------------------------------- | ------------------------------ | ------------------ | ------------------------------------------------------- |
| Lighthouse CI          | ☑      | ✅ budgets (Perf95/SEO100/LCP/CLS) | runs on PR                     | [seo](docs/seo.md) | `.github/workflows/lighthouse.yml`, `lighthouserc.json` |
| PageSpeed Insights     | ◐      | ✅ workflow job (API)              | ☐ needs deployed URL + API key | [seo](docs/seo.md) | `.github/workflows/lighthouse.yml`                      |
| Google Search Console  | ◐      | 📄 integration + API documented    | ☐ needs verified domain        | [seo](docs/seo.md) | doc only                                                |
| Google Merchant Center | ◐      | 📄 integration + API documented    | ☐ needs account                | [seo](docs/seo.md) | doc only                                                |
| Bing Webmaster Tools   | ◐      | 📄 integration + API documented    | ☐ needs verified domain        | [seo](docs/seo.md) | doc only                                                |
| Screaming Frog (Free)  | ◐      | 📄 usage + limits documented       | ☐ manual desktop tool          | [seo](docs/seo.md) | doc only                                                |

¹ _cfg-valid = the service's compose definition + config file parse and validate
(`docker compose config`); boot/scrape verification is pending the Docker
network fix below._

---

## Blockers / notes

- ~~**Local Docker Desktop network subsystem wedged.**~~ **RESOLVED 2026-07-23**
  — daemon 29.6.2 healthy, `monitoring` network + all 12 containers created
  cleanly. One WSL2-only issue remained (node-exporter `rslave` bind on `/`),
  fixed via `docker-compose.monitoring.windows.yml` (dev override; base compose
  unchanged for Linux prod). Boot + verify per
  [README → Health checks](README.md#health-checks).
- **SaaS/DAST tools can't be end-to-end verified pre-launch.** ZAP, PageSpeed
  Insights, Search Console, Merchant Center and Bing all require a **deployed,
  domain-verified** environment and real credentials. Their configs/workflows/docs
  are complete and ready; they light up when staging exists (plan Phase 4/5).
- **cAdvisor on Windows/Docker Desktop** may expose a reduced metric set (WSL2
  cgroup access) — non-fatal; full metrics on the Linux staging/prod hosts.
- ~~**Read-only DB role** for the Postgres exporter.~~ **DONE 2026-07-23 (task 28)**
  — `slink_exporter` (pg_monitor only, denied on app tables) via
  [config/postgres/exporter-role.sql](config/postgres/exporter-role.sql); the
  exporter DSN in `.env`/template no longer uses the app superuser. Inject the
  password from SSM/Secrets Manager in staging/prod.
- **PostHog self-hosting** deliberately excluded from the compose stack (heavy);
  existing privacy-safe Cloud config documented and kept.

## Next step — DONE (2026-07-23)

The **Monitoring API (NestJS)** + admin Monitoring UI are built and verified at
[`services/monitoring/`](../../services/monitoring/) (self-contained; own
install/build, does not touch the pnpm workspace). Read-only facade per
[docs/monitoring-api.md](docs/monitoring-api.md): `/monitoring/{health,uptime,
metrics/:kind,alerts,logs,queues}` live, `{security,seo,analytics}` gated until
their SaaS creds/URL exist, plus a self-contained admin dashboard at `/`. 26/26
unit tests; all self-hosted endpoints verified against this live stack. The
exporter now runs as the least-privilege `slink_exporter` role
([config/postgres/exporter-role.sql](config/postgres/exporter-role.sql), task 28).

**Remaining follow-ups (post-launch / other sessions):**

- Bull Board's `/api/queues` reports 0 despite `bull:*` keys in Redis (container
  discovery quirk). The Monitoring API's `/monitoring/queues` degrades
  gracefully; switch it to the spec's direct-Redis/bullmq read for real counts.
- WSL2 dev host: reduced node-exporter disk + cAdvisor container metrics
  (no `name` label) — full on the Linux prod host.
- Uptime Kuma monitors + blackbox prod probes + ZAP/PSI/Search Console need the
  deployed URL (coordinate with the deploy session).
- Embed the dashboard as a Medusa admin route (owned by the Medusa session).

## Ops & runbook docs (Session 3, 2026-07-23)

- [docs/runbook.md](docs/runbook.md) — **site-down triage, rollback, RDS restore,
  <1h re-provision** (task 47). Every alert's `runbook_url` points here.
- [docs/secrets-rotation.md](docs/secrets-rotation.md) — **rotation procedure** for
  every secret (task 53).
- [docs/prod-monitoring-armup.md](docs/prod-monitoring-armup.md) — **post-deploy
  flip list** for ZAP/PSI (task 36) + blackbox prod probes / Uptime Kuma (task 37).
  Blackbox targets are now **file_sd** (`config/prometheus/targets/*.yml`) → arming
  prod is one hot-reloaded edit.
- [docs/analytics-dashboards.md](docs/analytics-dashboards.md) — **PostHog funnel +
  UTM convention** (task 65).
- Alert rules now carry `runbook_url` + an **SLO group** (availability/latency
  burn); Grafana overview has an **Application SLOs** panel section.
