# Prod monitoring arm-up (tasks 36 + 37) — the post-deploy flip list

These checks **run against the live site**, so they can't fully run until Session 2's
deploy is up. Everything below is **pre-staged now** and parameterized by the prod
URL, so the moment `https://saludlinkusa.com` is live it's a short, mechanical flip
— not a from-scratch build.

> `PROD_URL` = `https://saludlinkusa.com` · admin = `https://manage.saludlinkusa.com`.
> Owner: Session 3. When you arm these, tick tasks 36/37 in `completion.md`.

---

## Task 37 — Uptime Kuma + blackbox prod probes

### 37a. Blackbox probes (DONE pre-staging — one file edit to arm)

Prometheus now reads blackbox targets from **file service discovery**, so arming
prod is a single hot-reloaded edit (no restart):

1. Edit [`config/prometheus/targets/blackbox-http.yml`](../config/prometheus/targets/blackbox-http.yml)
   — replace the dev `host.docker.internal` targets with:
   ```yaml
   - targets:
       - https://saludlinkusa.com/api/health
       - https://manage.saludlinkusa.com/health
     labels:
       env: production
   ```
2. Arm **TLS cert monitoring**: uncomment the block in
   [`config/prometheus/targets/blackbox-tls.yml`](../config/prometheus/targets/blackbox-tls.yml)
   (the https roots). This lights up `probe_ssl_earliest_cert_expiry` → the
   `TLSCertExpiringSoon` alert.
3. Save. Prometheus picks it up within `refresh_interval` (30s) — verify at
   `:9090/targets` that `blackbox-http` / `blackbox-http-tls` show the prod URLs
   `up`. The `SiteProbeFailing` alert now guards the real site.

> The coming-soon wall returns 200 on `/` and `/api/health` is excluded from the
> wall, so probe `/api/health` (storefront) and `/health` (medusa) — both return
> 2xx while the wall is up, giving true uptime signal without the wall skewing it.

### 37b. Uptime Kuma monitors (set in UI on first run)

Uptime Kuma has no config file / no REST CRUD (per the API contract) — monitors
are created once in its UI (`:3002`, behind the admin subdomain). Create these:

| Monitor name        | Type     | URL / target                              | Interval | Notes                          |
| ------------------- | -------- | ----------------------------------------- | -------- | ------------------------------ |
| Storefront          | HTTP(s)  | `https://saludlinkusa.com/api/health`     | 60s      | keyword check `"ok"`           |
| Admin (Medusa)      | HTTP(s)  | `https://manage.saludlinkusa.com/health`  | 60s      | keyword check `OK`             |
| Storefront home     | HTTP(s)  | `https://saludlinkusa.com`                | 300s     | 200 (wall page is a valid 200) |
| TLS expiry          | (auto)   | any https monitor surfaces cert age       | —        | Kuma warns ~14d by default     |

Then create a **status page** with slug `saludlink` (the Monitoring API reads
`/api/status-page/heartbeat/saludlink`). Optionally enable **Settings → API Keys**
and add Uptime Kuma's `/metrics` as a Prometheus scrape target so uptime lands in
the same TSDB (see the commented job stub in the monitoring-api doc).

---

## Task 36 — ZAP baseline + PageSpeed (+ Search Console)

These live in existing **GitHub Actions** (owned by the CI/security workflows, not
this session's files) and are **already `workflow_dispatch`-parameterized** with a
URL input. No workflow edit needed — just dispatch them post-deploy:

### 36a. OWASP ZAP baseline — `.github/workflows/dast-zap.yml`

Passive baseline scan (safe, no active attack payloads). Run against the live URL:

```bash
gh workflow run dast-zap --field target_url=https://saludlinkusa.com
```

- It also runs weekly (Mon 03:00 UTC); update the schedule default to the prod URL
  when the site is stable, or leave manual.
- Findings land as a tracking issue + `zap-baseline-report` artifact. Tune
  acceptable warnings in `.zap/rules.tsv` (tighten `WARN` → `FAIL` as the site
  hardens).
- ⚠ ZAP behind the coming-soon wall only sees the wall page. For a meaningful
  scan, either run it after the wall comes down, or dispatch it with a preview
  cookie/allowlisted run against the real routes.

### 36b. PageSpeed Insights — `.github/workflows/lighthouse.yml` (`psi` job)

```bash
gh workflow run lighthouse --field psi_url=https://saludlinkusa.com
```

- Needs repo secret `PAGESPEED_API_KEY` (Google PSI API key) set.
- Emits Performance/SEO/LCP/CLS + a `psi-report` artifact, feeding the perf gate
  and the Monitoring API's `/monitoring/seo` (still gated until wired).
- The local Lighthouse-CI budgets (`lhci` job) already run on storefront PRs — this
  `psi` path adds the **field** measurement against the deployed URL.

### 36c. Google Search Console (manual, post-wall)

Submit the sitemap + verify the domain **after the coming-soon wall comes down**
(task 64) — a walled site with `Disallow: /` should not be submitted for indexing.
Verification = a DNS TXT record in Route53 zone `Z06260013ISSB2PIIPCJS` or the
existing `/.well-known` route.

---

## Arm-up checklist (run in order once PROD_URL is live)

- [ ] 37a — flip `blackbox-http.yml` to prod URLs; uncomment `blackbox-tls.yml`.
- [ ] 37a — verify `:9090/targets` shows prod probes `up`; `SiteProbeFailing` guards prod.
- [ ] 37b — create the 3–4 Uptime Kuma monitors + `saludlink` status page.
- [ ] 36a — `gh workflow run dast-zap --field target_url=$PROD_URL` (post-wall for real coverage).
- [ ] 36b — set `PAGESPEED_API_KEY` secret; `gh workflow run lighthouse --field psi_url=$PROD_URL`.
- [ ] 36c — (after task 64 wall-down) submit sitemap to Search Console.
- [ ] Tick tasks 36 + 37 in `completion.md`.
