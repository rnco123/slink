# Monitoring Stack Integration — Progress Tracker

Living status for the "integrate all monitoring/observability/logging/analytics/
SEO/security tools" task. Updated continuously. Legend: ☑ done · ◐ in progress ·
☐ not started.

**Overall completion: ~85%** — all tools integrated, configured and documented;
the full compose stack **statically validated** (`docker compose config` +
per-service parse). **Live boot is currently BLOCKED** by a local Docker Desktop
fault: the daemon's network-creation subsystem is wedged (a bare
`docker network create` also hangs), so no containers could be started on this
machine yet. Fix = restart Docker Desktop / `wsl --shutdown` (bounces the app's
Postgres/Redis too), then `docker compose ... up -d`. The remaining work beyond
that is live bring-up of CI/SaaS-dependent tools (ZAP/PSI/Search Console) which
need a deployed URL + credentials that don't exist at this pre-launch stage.

_Last updated: 2026-07-22._

> ⚠️ **Boot status:** all 12 images pulled successfully; compose config valid;
> container start blocked ONLY by the wedged Docker network subsystem on this
> host (reproducible with `docker network create testnet`). Not a config defect.

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
| PostHog (privacy-safe) | ☑      | ✅ existing config documented (unchanged) | existing | [analytics-posthog](docs/analytics-posthog.md) | doc only |

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

- **Local Docker Desktop network subsystem wedged (active blocker for live boot).**
  On this dev host, `docker network create` hangs indefinitely (libnetwork/IPAM
  stuck), so `docker compose up` cannot create the `monitoring` network. The
  daemon otherwise responds (`docker ps`, `docker pull` work — all 12 images
  pulled). **Fix:** restart Docker Desktop (or `wsl --shutdown` then reopen
  Docker Desktop), then from `infra/monitoring/`:
  `docker compose -f docker-compose.monitoring.yml --env-file .env up -d`,
  and verify per [README → Health checks](README.md#health-checks). This is an
  environment fault, not a defect in the stack config.
- **SaaS/DAST tools can't be end-to-end verified pre-launch.** ZAP, PageSpeed
  Insights, Search Console, Merchant Center and Bing all require a **deployed,
  domain-verified** environment and real credentials. Their configs/workflows/docs
  are complete and ready; they light up when staging exists (plan Phase 4/5).
- **cAdvisor on Windows/Docker Desktop** may expose a reduced metric set (WSL2
  cgroup access) — non-fatal; full metrics on the Linux staging/prod hosts.
- **Read-only DB role** for the Postgres exporter should be created before
  staging/prod (currently uses the app user for local dev only).
- **PostHog self-hosting** deliberately excluded from the compose stack (heavy);
  existing privacy-safe Cloud config documented and kept.

## Next step (not started — gated on this task)

Build the **Monitoring API (NestJS)** aggregating the sources per
[docs/monitoring-api.md](docs/monitoring-api.md), then the admin Monitoring UI.
