# SEO Monitoring & Tooling

How Saludlink verifies with the major search/commerce consoles, enforces performance/SEO budgets in
CI, and how the future **Monitoring** module (NestJS API) will pull SEO signals programmatically.

Brand domain: **saludlinkusa.com** (storefront), admin at **manage.saludlinkusa.com**. The storefront
(Next.js 15) already ships SEO infrastructure under task **T15** — `generateMetadata`, canonicals,
JSON-LD, and dynamic [`robots.ts`](../../../apps/storefront/src/app/robots.ts) +
[`sitemap.ts`](../../../apps/storefront/src/app/sitemap.ts). Because these are Next.js route handlers,
the app can also serve any HTML/file-based verification token from a route — so we are not limited to
DNS verification.

CI enforcement is defined in [`.github/workflows/lighthouse.yml`](../../../.github/workflows/lighthouse.yml)
and [`lighthouserc.json`](../../../lighthouserc.json), mirroring the plan gates: **Perf ≥95, SEO 100,
LCP <2.0s, CLS <0.05** (plan Phase 2, task **T15/T36**).

---

## Google Search Console (GSC)

**Type.** External SaaS. Reports how Google crawls, indexes, and ranks the site (search analytics,
coverage/indexing, Core Web Vitals field data, sitemaps, manual actions).

**Verification / integration method.** For a whole domain (`saludlinkusa.com` + all subdomains) use a
**Domain property** verified by a **DNS TXT** record at the registrar. For a single origin use a
**URL-prefix property**, verifiable by DNS TXT, an **HTML `<meta>` tag** (emit via Next.js
`generateMetadata`/`metadata` in the root layout), an **HTML file** (serve from a Next.js route so it
resolves at `/googlexxxx.html`), or by linking a Google Analytics/Tag Manager tag. Prefer the Domain
property (DNS TXT) so staging and production subdomains are covered by one verification.

**Data exposed.** Clicks, impressions, CTR, average position — sliced by query, page, country,
device, and date; index coverage; sitemap status; CWV.

**API for the Monitoring module.** *Search Console API v3*.

- Base URL: `https://www.googleapis.com/webmasters/v3` (discovery host
  `https://searchengines.googleapis.com`).
- Auth: **OAuth2 service account** whose service-account email is added as a user on the verified
  GSC property (delegated, domain-verified access). Scope
  `https://www.googleapis.com/auth/webmasters.readonly`.
- Key endpoint: `POST /sites/{siteUrl}/searchAnalytics/query` (`searchanalytics.query`).
- Quotas: ~**1,200 queries/minute** per property, and up to **25M rows/day** per property.

Example request:

```bash
curl -sS -X POST \
  -H "Authorization: Bearer $GSC_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  "https://www.googleapis.com/webmasters/v3/sites/sc-domain:saludlinkusa.com/searchAnalytics/query" \
  -d '{
        "startDate": "2026-07-01",
        "endDate": "2026-07-21",
        "dimensions": ["query"],
        "rowLimit": 5
      }'
```

Trimmed response:

```json
{
  "rows": [
    { "keys": ["telemedicine consultation"], "clicks": 812, "impressions": 20431, "ctr": 0.0397, "position": 4.6 },
    { "keys": ["online pharmacy usa"],       "clicks": 640, "impressions": 33110, "ctr": 0.0193, "position": 7.9 }
  ],
  "responseAggregationType": "byProperty"
}
```

---

## Google Merchant Center (GMC)

**Type.** External SaaS. Hosts the product feed that powers Google Shopping / free product listings;
surfaces item-level and account-level policy/data issues (critical for a regulated health-product
catalogue).

**Verification / integration method.** The website is claimed/verified the same way as GSC (DNS TXT,
HTML meta, or HTML file served by Next.js); verification is typically shared with the GSC property.
Products are supplied via a feed or the Content API.

**Data exposed.** Product approval/disapproval status, item-level issues (e.g. missing GTIN, policy
violations, price/availability mismatch), and account-level warnings.

**API for the Monitoring module.** *Content API for Shopping v2.1*.

- Base URL: `https://shoppingcontent.googleapis.com/content/v2.1`.
- Auth: **OAuth2 service account** added as a user on the Merchant Center account. Scope
  `https://www.googleapis.com/auth/content`.
- Key endpoints: `products` (feed CRUD), `productstatuses` (per-item issues),
  `accountstatuses` (account-level issues).

Example — item-level issues:

```bash
curl -sS \
  -H "Authorization: Bearer $GMC_ACCESS_TOKEN" \
  "https://shoppingcontent.googleapis.com/content/v2.1/{merchantId}/productstatuses"
```

Trimmed response:

```json
{
  "resources": [
    {
      "productId": "online:en:US:sku_12345",
      "title": "Sample OTC Product",
      "destinationStatuses": [{ "destination": "Shopping", "status": "disapproved" }],
      "itemLevelIssues": [
        {
          "code": "policy_enforcement_account_disapproval",
          "servability": "disapproved",
          "resolution": "merchant_action",
          "attributeName": "",
          "description": "Product not compliant with healthcare & medicines policy",
          "documentation": "https://support.google.com/merchants/answer/6150127"
        }
      ]
    }
  ]
}
```

---

## Bing Webmaster Tools (BWT)

**Type.** External SaaS. Bing's equivalent of GSC — crawl stats, index status, rank/traffic, keyword
data. Also feeds Yahoo and (indirectly) some AI search surfaces.

**Verification / integration method.** DNS **CNAME/TXT**, an **XML file** (`BingSiteAuth.xml`, served
from a Next.js route), or an HTML `<meta>` tag. Sites already verified in GSC can be **imported**
directly into BWT.

**Data exposed.** Rank & traffic (clicks/impressions/avg position), crawl stats
(crawled/blocked/errors), index coverage, keyword and backlink data.

**API for the Monitoring module.** *Bing Webmaster API (JSON)*.

- Base URL: `https://ssl.bing.com/webmaster/api.svc/json`.
- Auth: **API key** appended as `?apikey=` (generated in BWT → Settings → API access).
- Key endpoints: `GetRankAndTrafficStats`, `GetCrawlStats`, `GetUrlTrafficInfo`,
  `GetKeywordStats`.

Example request:

```bash
curl -sS \
  "https://ssl.bing.com/webmaster/api.svc/json/GetRankAndTrafficStats?siteUrl=https://saludlinkusa.com&apikey=$BWT_API_KEY"
```

Trimmed response:

```json
{
  "d": [
    { "Date": "/Date(1752969600000)/", "Impressions": 10432, "Clicks": 318, "AvgImpressionPosition": 12.4, "AvgClickPosition": 6.1 }
  ]
}
```

---

## Lighthouse CI (LHCI)

**What it does.** Runs Google Lighthouse in CI against a locally built+served storefront and asserts
performance/SEO/accessibility/CWV **budgets** so regressions block the PR.

**How it's wired here.** The `lhci` job in
[`.github/workflows/lighthouse.yml`](../../../.github/workflows/lighthouse.yml) builds the storefront
(`pnpm --filter storefront build`), then runs `@lhci/cli autorun --config=./lighthouserc.json`.
Config [`lighthouserc.json`](../../../lighthouserc.json) starts the server (`pnpm --filter storefront
start -p 8000`), runs 3 iterations (desktop preset) over `/us`, `/us/telemedicine`, `/us/about`, and
asserts:

| Metric | Assertion |
|--------|-----------|
| `categories:performance` | error, minScore **0.95** |
| `categories:seo` | error, minScore **1.0** |
| `categories:accessibility` | warn, minScore 0.95 |
| `categories:best-practices` | warn, minScore 0.95 |
| `largest-contentful-paint` | error, max **2000 ms** |
| `cumulative-layout-shift` | error, max **0.05** |

**Run locally.**

```bash
pnpm dlx @lhci/cli@0.14.x autorun --config=./lighthouserc.json
```

**Env/secrets.** `LHCI_GITHUB_APP_TOKEN` (optional) posts status checks back to the PR. No secret
needed for the assertions themselves.

**Where results upload.** `upload.target: temporary-public-storage` — each run prints a temporary
public report URL (auto-expires). It runs on PRs touching `apps/storefront/**` and via
`workflow_dispatch`.

**Fail vs advisory.** `error` assertions (performance, SEO, LCP, CLS) **fail the build**;
accessibility/best-practices are `warn` (advisory) until pages stabilise.

**Monitoring module option.** For historical trend the Monitoring API should query an **LHCI server**
(self-hosted `lhci server`) instead of temporary storage: point `upload.target: lhci` +
`serverBaseUrl` at it, then read `/v1/projects/{id}/builds` and
`/v1/projects/{id}/builds/{buildId}/runs` for time-series scores. Until then, PSI (below) is the
programmatic source.

---

## PageSpeed Insights (PSI)

**What it does.** Runs Lighthouse on Google's infrastructure for a **deployed** URL and returns lab
scores plus real-user (CrUX) field data — the way to monitor the *live* staging/production site
rather than a CI build.

**How it's wired here.** The `psi` job in
[`.github/workflows/lighthouse.yml`](../../../.github/workflows/lighthouse.yml) (runs on
`workflow_dispatch`) already calls the PSI REST API against `psi_url` (default
`https://staging.saludlinkusa.com`), extracts performance/SEO/LCP/CLS with `jq`, and uploads
`psi-mobile.json` as an artifact.

**API for the Monitoring module.**

- Base URL: `https://www.googleapis.com/pagespeedonline/v5/runPagespeed`.
- Auth: **API key** via `&key=` (secret `PAGESPEED_API_KEY`).
- Params: `url`, `strategy=mobile|desktop`, repeatable `category=performance|seo|accessibility|best-practices`.
- Quota: **25,000 requests/day**, **240 requests/minute** with a key.

Example request:

```bash
curl -sS \
  "https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=https://staging.saludlinkusa.com&strategy=mobile&category=performance&category=seo&key=$PAGESPEED_API_KEY"
```

Trimmed response:

```json
{
  "lighthouseResult": {
    "categories": {
      "performance": { "score": 0.97 },
      "seo": { "score": 1.0 }
    },
    "audits": {
      "largest-contentful-paint": { "displayValue": "1.8 s", "numericValue": 1804 },
      "cumulative-layout-shift":  { "displayValue": "0.03",  "numericValue": 0.03 }
    }
  },
  "loadingExperience": {
    "metrics": {
      "LARGEST_CONTENTFUL_PAINT_MS": { "percentile": 1920, "category": "FAST" }
    }
  }
}
```

---

## Screaming Frog SEO Spider (Free Edition)

**What it does.** Desktop site crawler for technical SEO audits — broken links, redirect chains,
duplicate/missing titles & meta descriptions, canonical/hreflang issues, orphan pages, and directives
crawled from `robots.txt`/`sitemap.xml`.

**Free-tier limits.** Up to **500 URLs per crawl**; **no scheduling, no CLI/API, no persistence
config** on the free tier. Those are paid-licence features.

**Headless/CLI usage (paid tier, for CI).** With a licence it can run headless for automated exports:

```bash
screamingfrogseospider \
  --crawl https://staging.saludlinkusa.com \
  --headless \
  --save-crawl \
  --output-folder ./sf-out \
  --export-tabs "Internal:All,Response Codes:Client Error (4xx)" \
  --bulk-export "Response Codes:Redirection (3xx) Inlinks"
```

**Positioning for the Monitoring module.** Screaming Frog is a **manual, periodic audit tool**, not a
programmatic feed — the free edition has no API. Treat it as a scheduled human step: crawl staging,
**export** the Internal/Response-Codes/Page-Titles tabs to CSV, and file issues. For *automated* SEO
monitoring the practical substitutes are **Google Search Console** (coverage/indexing/queries) plus
**Lighthouse CI / PSI** (technical + performance), which do expose APIs.

---

## Integration notes for the Monitoring module

| Tool | Auth method | Base URL | Key endpoint | Rate limit |
|------|-------------|----------|--------------|------------|
| Google Search Console | OAuth2 service account (`webmasters.readonly`), added to property | `https://www.googleapis.com/webmasters/v3` | `POST /sites/{siteUrl}/searchAnalytics/query` | ~1,200 queries/min; 25M rows/day per property |
| Google Merchant Center | OAuth2 service account (`content`), added to GMC account | `https://shoppingcontent.googleapis.com/content/v2.1` | `productstatuses`, `accountstatuses`, `products` | Standard Content API quotas (per-project) |
| Bing Webmaster Tools | API key (`?apikey=`) | `https://ssl.bing.com/webmaster/api.svc/json` | `GetRankAndTrafficStats`, `GetCrawlStats` | ~10,000 calls/day (per BWT account) |
| Lighthouse CI | LHCI server token (self-hosted) / none in CI | self-hosted `lhci server` | `/v1/projects/{id}/builds` | self-hosted (no external limit) |
| PageSpeed Insights | API key (`&key=`) | `https://www.googleapis.com/pagespeedonline/v5/runPagespeed` | `runPagespeed` | 25,000 req/day; 240 req/min |
| Screaming Frog (Free) | none (no API) | n/a — desktop app | manual CSV export | 500 URLs/crawl; no scheduling/API |

**Environment note.** Point all automated SEO monitoring (PSI runs, Lighthouse dispatch, verification
tokens) at **staging** (`staging.saludlinkusa.com`) during development; switch the target to
production (`saludlinkusa.com`) only for the live-property GSC/GMC/BWT data feeds, which necessarily
reflect the production domain. Keep API keys and service-account JSON in secrets (GitHub Actions
secrets / the monitoring `.env`), never in the repo.
