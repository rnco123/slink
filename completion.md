# Saludlink — Completion Tracker

End-to-end status. Legend: ☑ done/verified · ◐ partial · ☐ not started · ⚠ breaking
Last checked: 2026-07-22 (session).

---

# 🔗 DEPENDENCY ROADMAP — arranged by what blocks what

Rule: every task in a phase can run **in parallel**; a task starts only when its `←` blockers are done. Human-gated tasks marked 🧑.

## P1 — zero dependencies (all can start today, in parallel)

1. ☐ Fix sitemap `/us` bug (`sitemap.ts:21`) + `lighthouserc.json` URLs
2. ☐ Commit in-flight e2e changes (3 files)
3. ☐ Dedupe `@types/react` (storefront tsc)
4. ☐ Fix `packages/privacy` tsconfig (downlevelIteration)
5. ☐ Diagnose turbo crash (exit 3221225781)
6. ☐ Husky + lint-staged (local hooks)
7. ☐ Dockerfiles: Next standalone, Medusa server+worker, migration one-shot (T35)
8. ☐ Catalog modeling + compliance metadata + real product seed (T18)
9. ☐ Seed content DB (10 legal pages EN+ES)
10. ☐ PostHog funnel events via `captureSafeEvent`
11. ☐ Boot monitoring compose stack locally
12. ☐ A11y pass to ≥95
13. ☐ Verify admin login + content CRUD journeys (Medusa already up)
14. 🧑 AWS account + CLI creds + domain confirm
15. 🧑 Business facts: licensed-state list, legal entity name, contact/address

## P2 — blocked by one P1 task

16. ☐ GitHub repo (public) + push ← **2** (commit first)
17. ☐ Legal-pages e2e green (`test:e2e:commerce` legal part) ← **9**
18. ☐ Full backend-free e2e green (`test:e2e`) ← **1** (sitemap spec touches)
19. ☐ PDP / categories / collections e2e ← **8** (needs real products)
20. ☐ Stripe test mode via Medusa (T22) ← **8**
21. ☐ Deals/promotions in admin (T24) ← **8**
22. ☐ Sitemap emits products + articles ← **8**, **9**
23. ☐ Admin UI Playwright suite ← **13**
24. ☐ API integration tests (content CRUD) ← **13**
25. ☐ Prod-build Lighthouse (real Perf gate) ← **1** (+ build must pass: **3**,**4** if they break build)
26. ☐ Replace placeholder constants in code ← **15** 🧑
27. ☐ Monitoring API (NestJS) + admin Monitoring UI ← **11**
28. ☐ Postgres exporter read-only role ← **11**
29. ☐ Cost governance: `Project=slink` tags plan + $60 budget ($30/$48/$60 → raheelhussainco@gmail.com) + billing backstop ← **14** 🧑

## P3 — blocked by P2

30. ☐ CI additions: ESLint job, CodeQL, Actionlint, Zizmor, OSV-weekly, Hadolint ← **16** (repo exists; Hadolint also ← **7**)
31. ☐ Checkout e2e browse→pay→confirm (T26) ← **20**
32. ☐ Logged-in account + order confirm/transfer e2e ← **20** (orders need payments)
33. ☐ Core infra up: EC2 t4g.medium + EIP + Compose (Caddy/apps/redis), RDS micro, Route53 (`manage.` public), S3, SES, SSM secrets ← **29** (governance first), **7**
34. ☐ Order emails + revalidation webhook (T25) ← **20**; prod-send ← SES (**33**)

## P4 — blocked by P3 (needs live URL)

35. ☐ CI/CD deploy: Actions → GHCR → SSH/SSM compose pull/up ← **30**, **33**
36. ☐ ZAP baseline + PageSpeed + Search Console live ← **35**
37. ☐ Uptime Kuma + monitoring against prod ← **35**, **11**
38. ☐ Both e2e suites in CI against staging ← **35**

## P5 — end-chain (before real customer data) — mostly 🧑

39. 🧑 AWS BAA + PostHog BAA + vendor inventory ← **14**
40. 🧑 Counsel review of legal pages, NPP, consent, breach procedure, SRA ← **9**, **26**
41. ☐ HIPAA technical: MFA/RBAC, session timeout, audit-log coverage, PHI-safe errors ← **33**
42. ☐ Deferred infra: WAF, Secrets Manager, Multi-AZ, CloudFront, Cognito ← revenue/PHI decision
43. 🧑 LegitScript application (T40) ← **35**, **26**, **40**

**Critical path (longest chain):** 14🧑 → 29 → 33 → 35 → 36/43 (AWS account is the gate for everything deploy-side)
**Code-side critical path:** 8 → 20 → 31 (catalog → Stripe → checkout e2e)

---

**Task count: 43 roadmap tasks** (rolling up ~90 detail checkboxes below). 5 are human-gated 🧑.

**Claude Opus time estimate** (focused sessions, this machine):
| Tier | Est. |
|---|---|
| P0 bugs | 1–2 h |
| P1 CI + gaps | ~1 day |
| P2 tests | ~1 day |
| P3 ecommerce | 1–2 days |
| P4 deploy | ~1 day + your AWS/account actions |
| P5 monitoring | ~½ day |
| P6 compliance | ~1 day Claude-side; BAA/legal are human tasks |

**≈ 5–7 focused working days of Claude sessions** for everything Claude can do autonomously (P0–P5 ≈ 4–5 days). Human-gated items: AWS account/domain/Stripe keys, BAA signatures, legal review, LegitScript filing.

---

## 0. Infrastructure / Local Boot

- ☑ docker-compose (Postgres 16 + Redis 7) — **both containers Up & healthy**
- ☑ Postgres reachable `127.0.0.1:5432` (pg_isready OK)
- ☑ Redis reachable `127.0.0.1:6379` (PONG)
- ☑ Medusa DB migrations run clean — "Database up-to-date", links synced
- ☑ Medusa connects to Redis (event-bus / cache / workflow-engine)
- ☑ Env files present: `apps/medusa/.env`, `apps/storefront/.env.local` (+ templates)
- ☑ Both dev servers boot verified — Medusa ready :9000 (52s), storefront ready :8000 (6s); `/en` 200, `/health` 200
- ☑ IPv6 localhost trap avoided (uses `127.0.0.1`, not `localhost`)

## 1. Website (Storefront — Next.js 15)

- ☑ Next.js 15.3.9 app, App Router, `[countryCode]` i18n routing (en/es dictionaries)
- ☑ Ecommerce modules present: products, categories, collections, cart, checkout, order, account, shipping
- ☑ Marketing components + home module
- ☑ Legal pages lib (`src/lib/legal`)
- ☑ SEO lib (`src/lib/seo`) — JSON-LD/metadata scaffolding
- ☑ Analytics lib (`src/lib/analytics`)
- ☑ UI components (`src/components/ui`, `packages/ui`)
- ☑ E2E scaffolding (Playwright: legal.spec, routes, commerce-gated tests)
- ◐ Content wired to Medusa content module (needs live-boot verification)
- ☐ Full page-design pass / design-system sign-off (T1–T4 design phase)
- ⚠ `tsc --noEmit` fails in storefront — **@types/react 19 duplication** (JSX "not a valid component" errors); likely non-blocking for `next build`, needs dedupe

## 2. Admin Panel (Medusa v2 backend)

- ☑ Medusa v2.16.0 backend scaffolded
- ☑ Custom **content module** (models + migrations) — Medusa-native CMS (pivoted from embedded Payload)
- ☑ Custom **audit-log module** (models + migrations) — HIPAA append-only hook
- ☑ Admin routes: `articles`, `content`, `site-settings` (+ admin i18n, widgets)
- ☑ API routes: `admin/content`, `admin/custom`, `store/content`, `store/custom`
- ☑ Jobs / subscribers / workflows / links scaffolding present
- ☑ Security workflows scan admin code too (Semgrep owasp-top-ten / Trivy / gitleaks on whole repo)
- ☐ Admin login verified this session (local admin: owner@saludlinkusa.com)
- ☐ Admin Monitoring UI (surfacing Grafana/Prometheus/security findings inside admin) — gated on Monitoring API
- ☐ Catalog modeling + compliance metadata + seed catalog (T18)
- ☐ Deals/promotions config (T24)
- ☐ **Unified `manage.saludlinkusa.com` surface (T31) — REQUIRED: admin panel must live on `manage.` subdomain in production** (noindex + WAF/IP-restricted; Medusa admin + content admin behind it). Currently only `localhost:9000/app`.

## 3. Monitoring / Observability (infra/monitoring)

- ☑ Full self-hosted stack **configured & statically validated** (~85% per TASK.md)
- ☑ Grafana, Prometheus, Alertmanager (provisioned datasources, dashboard, alert rules)
- ☑ Exporters: Node, Postgres, Redis, cAdvisor, Blackbox
- ☑ Logging: Loki + Promtail (with PHI/secret redaction)
- ☑ Uptime Kuma (synthetic uptime / status page)
- ☑ Bull Board (BullMQ queue view, basic-auth)
- ☑ PostHog privacy-safe config documented
- ☐ **Monitoring stack live boot** (compose config valid; not yet started this session)
- ☐ Monitoring API (NestJS) aggregator + admin Monitoring UI (next step, not started)
- ◐ Read-only DB role for Postgres exporter (uses app user locally — fix before staging)

## 3b. OWASP Top 10 (2021) — control coverage

Verified 2026-07-22: Semgrep CI runs `p/owasp-top-ten` + `p/security-audit` + `p/nextjs`; storefront ships CSP, HSTS (2y+preload), X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy via `next.config.js`.

- ◐ **A01 Broken Access Control** — Medusa role model + admin auth in place; audit-log module exists; unified admin (`manage.`) IP/WAF restriction ☐ (needs infra)
- ◐ **A02 Cryptographic Failures** — HSTS preload set; TLS termination ☐ (no deployed env); secrets in `.env` local-only, Secrets Manager ☐
- ◐ **A03 Injection** — Semgrep SAST (owasp-top-ten ruleset) in CI; MikroORM/parameterized queries via Medusa; ZAP DAST ☐ (needs staging URL)
- ◐ **A04 Insecure Design** — PHI boundary docs (`docs/privacy-boundary.md`, `@saludlink/privacy` firewall); threat-model doc ☐
- ◐ **A05 Security Misconfiguration** — full security-header stack ☑; Trivy misconfig scan in CI ☑; securityheaders.com grade-A check ☐ (needs deploy)
- ◐ **A06 Vulnerable Components** — npm audit (high fails build) ☑, Trivy vuln ☑, Dependabot ☑; SBOM ☐
- ◐ **A07 Auth Failures** — Medusa session auth local; Cognito user pool ☐ (T27); httpOnly cookie sessions storefront ☐ (T28); MFA ☐
- ☐ **A08 Software/Data Integrity** — signed revalidation webhooks ☐ (T25); artifact signing/provenance ☐; lockfile pinned ☑
- ◐ **A09 Logging/Monitoring Failures** — audit-log module ☑; Loki/Promtail with PHI redaction configured ☑ (not booted); Alertmanager routes ☑ (not booted); alerts→SNS ☐
- ◐ **A10 SSRF** — Semgrep rules cover; no user-supplied URL fetch surfaces found; ZAP verification ☐

## 4. Deployment Pipeline / CI-CD

- ☑ GitHub Actions: `security.yml` (Gitleaks, Trivy, Semgrep CE, npm audit)
- ☑ GitHub Actions: `lighthouse.yml` (Perf≥95 / SEO100 / LCP / CLS budgets)
- ☑ GitHub Actions: `dast-zap.yml` (OWASP ZAP baseline)
- ☑ Dependabot (npm + actions + docker)
- ☑ `lighthouserc.json` budgets
- ◐ ZAP / PageSpeed / Search Console / Merchant / Bing — **need a deployed URL + creds** (pre-launch gated)
- ⚠ **NO GitHub remote configured (verified 2026-07-22)** — all workflows are dormant; nothing has ever run in CI. First step: create GitHub repo + push

### Security screening pipeline — tool-by-tool plan (analysed 2026-07-22)

Decision basis: solo dev pushing straight to `main` → fast scanners run on **push to main + PR**; heavy/deep scans go **weekly schedule** so pushes stay quick.

Already in `security.yml` (keep as-is — push main + PR + weekly):
- ☑ **Gitleaks** — secrets, full history
- ☑ **Semgrep CE** — JS/TS SAST (owasp-top-ten, nextjs, typescript, secrets rulesets)
- ☑ **pnpm audit** — high+ fails build, JSON artifact
- ☑ **Trivy** — fs vuln + secret + misconfig, SARIF

To ADD:
- ☐ **ESLint in CI** (`turbo run lint`) — exists as script, never runs in CI. Push main: **YES** (fast, blocks quality regressions)
- ☐ **CodeQL** (js-ts) — necessary; **FREE for public repos**. Decision 2026-07-22: no GitHub plan purchase — repo stays/goes PUBLIC so CodeQL + Security-tab SARIF + unlimited Actions minutes all cost $0. (If repo ever goes private: CodeQL requires paid GHAS ~$30/user/mo — then drop it and rely on Semgrep.)
- ☐ GitHub plan: **Free — $0.** Public repo = CodeQL, code scanning, Dependabot, unlimited Actions minutes all included
- ☐ **Actionlint** — validates workflow YAML. Path-filtered to `.github/**` only (no cost on normal pushes)
- ☐ **Zizmor** — GitHub Actions security audit (injection, pwn-request, untrusted inputs). Path-filtered to `.github/**`
- ☐ **Hadolint** — Dockerfile lint. **Gated on T35** (no Dockerfiles exist yet); add the job with the first Dockerfile
- ☐ **OSV-Scanner** — OPTIONAL: heavy overlap with pnpm audit + Trivy (same OSV/CVE DBs). Verdict: weekly schedule only, not push — redundant on every push
- ☐ **Husky (local pre-commit)** — not installed. Add husky + lint-staged:
  - pre-commit: `lint-staged` (eslint --fix + prettier on staged files) + `gitleaks protect --staged` — keep <5s
  - pre-push: `pnpm typecheck` (blocked today by the turbo crash — fix that first)

Push-to-main need summary: **YES** = Gitleaks, Semgrep, pnpm audit, Trivy, ESLint, CodeQL · **path-filtered** = Actionlint, Zizmor · **weekly only** = OSV-Scanner, deep scans · **later** = Hadolint (with T35)

### Deployment plan — ACTIVE: budget single-box (~$45–55/mo, cap $60) — decided 2026-07-22

Architecture: one EC2 + RDS; no ALB/WAF/Fargate/ElastiCache/Secrets Manager; admin PUBLIC at `manage.` (Medusa login is the only gate).

**Cost governance (do FIRST, before any resource is created):**
- ☐ **Tag every resource `Project=slink`** (EC2, EIP, EBS, RDS, S3, Route53, SES, snapshots — no untagged resources, ever)
- ☐ Activate `Project` as a **cost-allocation tag** in Billing console (takes ~24h to appear in Cost Explorer)
- ☐ **AWS Budget: $60/month HARD CAP** — alerts at 50% ($30), 80% ($48), 100% ($60) + forecasted-overrun alert → email **raheelhussainco@gmail.com**
- ☐ (Optional) budget action at 100%: SNS → stop the EC2 instance (RDS keeps running so no data loss)
- ☐ Billing alarm on total account spend as backstop (catches untagged/accidental resources the Project budget misses)
- ☐ Install AWS CLI + configure credentials on this machine (not installed — verified 2026-07-22)

- ☐ EC2 t4g.medium (ARM, 4GB) + Elastic IP (~$24/mo) running Docker Compose:
  - ☐ Caddy — free auto-TLS + host routing (`saludlinkusa.com` → storefront, `manage.` → Medusa admin)
  - ☐ storefront (Next standalone image)
  - ☐ medusa server + worker (`MEDUSA_WORKER_MODE` split)
  - ☐ redis:7 in Docker (no ElastiCache — cache/event-bus loss is non-fatal)
- ☐ RDS Postgres 16 db.t4g.micro + 20GB (~$14/mo) — keep managed: automated backups + PITR
- ☐ Route53 hosted zone + `manage.` record; SES for order emails; S3 for media
- ☐ Secrets: `.env` on box / SSM Parameter Store free tier (NO Secrets Manager)
- ☐ No NAT gateway (public subnet), no CloudFront initially (add later, free tier)
- ☐ Dockerfiles (T35): Next standalone; Medusa server/worker; compose one-shot migration task
- ☐ CI/CD (T36-lite): GitHub Actions → build → GHCR/ECR → SSM/SSH → `docker compose pull && up -d`
- ☐ Minimal Terraform (or plain scripts) for: VPC-default, EC2, RDS, Route53, SES, S3

### Deferred until real customer data / revenue (HIPAA + LegitScript hard requirements — parked, NOT deleted)

- ☐ WAF + admin IP allowlist (admin is public for now — revisit before PHI)
- ☐ Secrets Manager, Multi-AZ RDS, ElastiCache, ECS Fargate split, ALB + CloudFront
- ☐ CloudTrail/Config/GuardDuty, alarms→SNS, k6, failover/restore drills (T37)
- ☐ AWS BAA (T39) — **must be signed before any real customer data regardless of budget**
- ☐ Cognito user pool via Terraform (T27)
- ☐ `terraform plan` gate in CI; staging→prod split
- ☐ App **Dockerfiles** (Next standalone; Medusa server + worker) + migration tasks — T35 not started
- ☐ AWS OIDC deploy + staging auto-deploy + prod approval gate — T36 not started
- ☐ Sign AWS BAA (T39)

## 5. Journey Points — every route/flow that can break (verify each after boot)

### 5a. Storefront public journeys (Next.js routes found in `src/app`)

Backend-free (should render with Medusa DOWN — covered by default e2e run):
- ☐ `/` homepage (en + es)
- ☐ `/about`, `/contact`, `/licensing`
- ☐ `/telemedicine` (FAQ, state availability, link-out CTA)
- ☐ `/conditions` hub + all 4 condition verticals `/conditions/[slug]` + unknown-slug 404
- ☐ Locale middleware redirect `/` → `/en|/es`, `<html lang>`, language switcher + cookie
- ☐ `robots.txt`, `sitemap.xml`, OG image, canonicals + hreflang
- ☐ Header nav / mega-footer trust stack / mobile menu

Backend-required (@commerce-gated — need Medusa UP **and seeded**):
- ☐ `/legal/[slug]` — **all 10 LegitScript trust docs now CMS-driven; 404 if content not seeded** ← recent pivot, uncommitted
- ☐ `/store` listing
- ☐ `/products/[handle]` PDP
- ☐ `/categories/[...category]`, `/collections/[handle]`
- ☐ `/cart` → add/update/remove items
- ☐ `/checkout` full flow (payment ☐ — Stripe not wired, T22)
- ☐ `/order/[id]/confirmed`
- ☐ `/order/[id]/transfer/[token]` accept/decline (order transfer journey)
- ☐ `/account` login/register + dashboard: orders, order details, addresses, profile
- ☐ Search (if enabled), region/country switching

### 5b. Medusa admin + API journeys

- ☐ Admin login at `:9000/app` (owner@saludlinkusa.com; dev quick-login button)
- ☐ Admin UI routes: Articles, Content, Site-settings (custom pages)
- ☐ Admin content API: CRUD `/admin/content/articles`, `/admin/content/pages`, `/admin/content/settings`
- ☐ Store content API: `/store/content/articles(/[slug])`, `/store/content/pages/[slug]`, `/store/content/settings`
- ☐ Seed scripts run: `seed.ts` (catalog) + `seed-content.ts` (legal/content pages, EN+ES)
- ☐ Audit-log writes on admin actions
- ☐ Jobs / subscribers / workflows fire (event-bus Redis)
- ☐ Publishable API key valid in storefront `.env.local` (mismatch = every storefront data call breaks)
- ☐ CORS: storefront origin allowed in medusa `.env` (STORE_CORS/ADMIN_CORS/AUTH_CORS)

### 5c. E2E suite state (the checklist runner)

9 specs: home, navigation, conditions, content-pages, legal(@commerce), i18n, seo, privacy, commerce(@commerce)
- ☐ Default run green (backend-free): `pnpm test:e2e`
- ☐ Commerce run green (backend + seeded): `pnpm test:e2e:commerce`
- ⚠ **Uncommitted in-flight change** (3 files): legal.spec.ts re-tagged `@commerce` + routes.ts moved legal slugs out of CONTENT_ROUTES + README — this was the last session's work; commit or finish it first

### 5c-2. Playwright coverage audit (verified 2026-07-22)

Covered (storefront):
- ☑ Home — hero/CTAs, title+meta, marketing sections, condition grid, Organization+WebSite JSON-LD
- ☑ Navigation — header/footer/logo/mobile menu, account+cart links
- ☑ Conditions — hub + 4 verticals + breadcrumb JSON-LD + 404
- ☑ Content pages — about/contact/licensing/telemedicine (FAQ, availability, external CTA)
- ☑ i18n — locale redirects, `<html lang>`, ES chrome, switcher + cookie
- ☑ SEO — robots.txt blocks transactional, sitemap XML, OG image, canonical+hreflang, robots meta
- ☑ Privacy/PHI — no clinical text in analytics egress, no PHI in URLs, session recording off
- ☑ Legal — all 10 trust docs (@commerce, needs seeded backend)
- ☑ Commerce basics — store listing, empty cart, login/register forms, add-to-cart (@commerce)

**NOT covered (storefront gaps):**
- ☐ Product detail page assertions (schema, buy box) — only touched via add-to-cart
- ☐ Categories / collections pages
- ☐ Checkout flow e2e (browse→cart→pay→confirmation) — T26, blocked on Stripe (T22)
- ☐ Order confirmed + order transfer accept/decline pages
- ☐ Account dashboard logged-in (orders, addresses, profile)
- ☐ Sitemap contains product/article URLs (they aren't emitted yet — sitemap TODO)

**NOT covered (admin/Medusa) — requirement: admin must be covered too:**
- ☐ Admin UI e2e — **zero Playwright coverage of :9000/app** (login, articles, content, site-settings, orders, products)
- ◐ API integration tests — only `health.spec.ts` exists; content CRUD / store content endpoints untested
- ☑ packages/privacy — 7 vitest suites (analytics, middleware, logger, sanitize, schemas, url, validate-no-phi)

### 5c-3. PostHog / analytics coverage audit (verified 2026-07-22)

- ☑ PostHog wired in storefront root layout via `/ingest` same-origin proxy (CSP-clean, adblock-resistant)
- ☑ Privacy-safe defaults: session recording OFF, all inputs masked, `person_profiles: identified_only`
- ☑ Manual `$pageview` on App Router navigations + `$pageleave`
- ☑ PHI firewall transport: `registerAnalyticsTransport` → only path to posthog.capture; ESLint bans direct posthog-js imports
- ⚠ **ZERO product events instrumented** — `captureSafeEvent()` has no callers in feature code. No funnel: add_to_cart, checkout_started, purchase_completed, signup, login, telemedicine_cta_click, language_switch, search
- ☐ `NEXT_PUBLIC_POSTHOG_KEY` set in env (provider no-ops without it — verify)
- ☐ Admin panel analytics/audit surfacing — none (audit-log module exists server-side; no admin usage analytics)
- ☐ PostHog dashboards/insights defined (funnels, retention) — nothing until events exist

### 5d. Known code-level TODOs that are journey-breaking risks

- ☐ `sitemap.ts:60,92` — product handles + CMS article slugs NOT in sitemap yet (SEO gap)
- ☐ `availability.ts:14` — licensed-state list is placeholder (compliance/LegitScript blocker)
- ☐ `site.ts:14` + `packages/ui tokens:45` — legal entity + contact details are placeholders (LegitScript blocker)
- ☐ `profile-email` / `profile-password` — account email/password update NOT supported (starter TODOs)
- ☐ `cart/item` — max-inventory check not wired to real inventory (overselling risk)
- ☐ PHI privacy middleware iteration bug risk: `packages/privacy/src/middleware.ts:247` typecheck error

## 5e. SEO performance test — LIVE RESULTS (2026-07-22, Lighthouse 12 desktop, dev server)

| Page | Perf* | SEO | A11y | Best-Pr | LCP | CLS |
|---|---|---|---|---|---|---|
| `/en` (home) | 71* | **100** ✅ | 92 | 96 | 2.0s | 0.000 |
| `/en/telemedicine` | 86* | **100** ✅ | 93 | — | — | 0.022 |
| `/en/about` | 89* | **100** ✅ | 92 | — | — | 0.019 |

\* Perf measured on **dev server (turbopack, unminified)** — not representative. Re-run against `next build` + `next start` for the real Perf≥95 gate.

- ☑ SEO category **100/100 on all 3 CI pages**, zero failing audits
- ☑ Title pattern `{keyword} | Saludlink`, meta description, `robots: index,follow`
- ☑ Canonical + hreflang (en-US / es-US / x-default)
- ☑ JSON-LD: `["Organization","MedicalOrganization"]` + WebSite + SearchAction + ContactPoint sitewide; Everlywell-grade Product schema lib (Offer, MerchantReturnPolicy, OfferShippingDetails + DefinedRegion) ready
- ☑ robots.txt blocks cart/checkout/account/admin/api; sitemap linked
- ☑ CLS ≈ 0 on all pages (gate: <0.05)
- ⚠ **CRITICAL SEO BUG: sitemap.xml emits `/us/...` for every URL → 307 → `/en/us...` → 404.** Entire sitemap points at 404s. Root cause: `sitemap.ts:21` `DEFAULT_COUNTRY="us"` (stale starter value; locales are en/es)
- ⚠ Same bug in `lighthouserc.json` — CI audits `http://localhost:8000/us` (a redirect), so CI Lighthouse measures the wrong page
- ☐ Products/articles still missing from sitemap (TODOs at sitemap.ts:60,92)
- ☐ A11y 92–93 (<95 warn budget) — worth a pass
- ☐ Perf gate (≥95, LCP<2.0s) — needs prod-build re-test

## 5f. HIPAA compliance tasks

Technical safeguards (in repo):
- ☑ PHI boundary architecture — website stores identity+orders only; clinical data never leaves EMR/telemedicine ([docs/privacy-boundary.md](docs/privacy-boundary.md))
- ☑ `@saludlink/privacy` firewall package — captureSafeEvent / safe-logger / buildSafeMetadata / validate-no-phi / sanitize-object + strict zod schemas, 7 vitest suites
- ☑ ESLint ban on direct posthog-js imports (single audited transport)
- ☑ Session recording disabled; inputs masked; identified-only profiles
- ☑ Promtail PHI/secret redaction pipeline configured (monitoring stack)
- ☑ Audit-log module in Medusa (append-only actor/action/entity/timestamp)
- ☐ Audit-log write coverage verified on all admin mutations
- ☐ Access controls: RBAC roles in Medusa admin beyond super-admin; least-privilege review
- ☐ Session timeout / automatic logoff policy (admin + storefront)
- ☐ Encryption in transit: TLS everywhere (prod TLS/HSTS ready; needs deployed env)
- ☐ Encryption at rest: RDS/ElastiCache/S3 encryption (Terraform, T34 — not started)
- ☐ Backup + disaster recovery: automated RDS backups, restore drills (T37)
- ☐ Unique user IDs + MFA for admin users
- ☐ PHI-safe error tracking (no PHI in stack traces / Sentry-equivalent review)

Administrative / legal safeguards:
- ☐ **Sign AWS BAA** (via AWS Artifact) BEFORE any real customer data (T39)
- ☐ PostHog BAA (required before session recording or any loosening of masking)
- ☐ Stripe / SES config review for PHI adjacency (order emails name health products)
- ☐ Notice of Privacy Practices (NPP) page — content seeded + reviewed by counsel
- ☐ Telehealth consent flow + record of consent
- ☐ Consumer Health Data Privacy Notice (WA/CA) + "Your Privacy Choices" control
- ☐ Security risk assessment (SRA) documented
- ☐ Workforce access policy + offboarding checklist
- ☐ Breach notification procedure documented
- ☐ Business Associate inventory (AWS, PostHog, Stripe, GitHub…)

## 6. Cross-cutting / Known Breakages

- ⚠ **sitemap.xml → all URLs 404** (`/us` country code vs `en/es` locales) — see §5e; fix `sitemap.ts:21` + `lighthouserc.json` URLs together
- ⚠ `turbo run typecheck` crashes with exit `3221225781` (DLL-not-found) — turbo/env issue on this host; individual `tsc` works
- ⚠ storefront `tsc`: `@types/react@19.0.5` duplicate resolution → JSX component type errors
- ⚠ `packages/privacy/src/middleware.ts:247` — `downlevelIteration`/target flag missing in tsconfig
- ℹ Bash tool's bundled node has a broken shared-lib load on this host — use PowerShell for node/pnpm
- ℹ `pnpm` can't be launched via PowerShell `Start-Process -FilePath pnpm` (.cmd shim) — needs `cmd /c` wrapper

---

## Next Actions (proposed, not started)

- [ ] Boot both dev servers, confirm admin `/app` + storefront `/en` load
- [ ] Dedupe `@types/react` to clear storefront typecheck
- [ ] Fix `packages/privacy` tsconfig target for downlevelIteration
- [ ] Boot monitoring compose stack, verify health endpoints
- [ ] Begin Phase 3 ecommerce: catalog modeling + seed (T18)
