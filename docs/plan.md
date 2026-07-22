# Saludlink — Platform Plan

Brand: **Saludlink** · domain **saludlinkusa.com** · design direction: **editorial / premium wellness** (serif display type, warm neutrals + deep green accent, photography-led). Future opportunity: bilingual EN/ES health content (underserved SEO space matching the brand name).

Healthcare ecommerce + telemedicine company website. SEO-first, HIPAA-ready, LegitScript-certification-ready.

---

## 1. What We're Building

The public face and commerce platform for a company that:
- Sells **health-management products** (physical goods — OTC, devices, wellness; no Rx in v1)
- Offers **telemedicine** through an **existing in-house microservice** (Daily.co-style video)
- Has a **custom in-house EMR** (system of record for all clinical data / PHI)

The website integrates with **neither** existing system in v1 — it links out to the telemedicine app and never touches the EMR. All three systems share identity later via SSO (website = identity provider).

**Priorities:** 1) SEO, 2) performance, 3) ecommerce, 4) security with a future HIPAA requirement.

---

## 2. Decided Architecture

| Layer | Decision | Why |
|---|---|---|
| Frontend | **Next.js 15 (App Router)** | Best-in-class SSR/SSG for SEO + performance |
| Ecommerce | **Medusa.js v2, self-hosted** | Full control; Shopify can't sign a BAA — dead end for HIPAA |
| CMS | **Payload CMS 3**, embedded in Next.js | Self-hosted in our VPC — no third-party content vendor; E-E-A-T editorial workflow |
| Identity | **AWS Cognito** user pool | Covered by AWS BAA; standard OIDC/JWKS so telemedicine + EMR validate our JWTs later |
| Payments | **Stripe** (via Medusa plugin) | |
| Email | **AWS SES** | BAA-eligible (order emails name health products) |
| Analytics | **Self-hosted Plausible** — no GA4 | No PHI-adjacent data to third parties; consent-gated |
| Hosting | **AWS only, BAA-eligible services** | ECS Fargate, RDS Postgres 16, ElastiCache Redis, CloudFront, WAF, S3, Secrets Manager |
| IaC / CI | **Terraform** + **GitHub Actions** (OIDC) | Auditable for compliance reviews |
| Repo | **Turborepo + pnpm** monorepo | `apps/storefront`, `apps/medusa`, `packages/*`, `infra/terraform` |

**PHI boundary (the HIPAA strategy):** the website stores identity + orders only. Clinical data never leaves the EMR/telemedicine boundary. This keeps the website's HIPAA audit scope minimal. Sign the AWS BAA (via AWS Artifact) before any real customer data.

---

## 3. What the Inspiration-Site Research Found

Full pass completed over all 20 sites (lifemd, everlywell, noom, mavenclinic, thriveworks, jumpstartmd, legitscript, express-scripts, optumrx, lloydspharmacy, geisinger, multicare, cedars-sinai, healthsmart, justanswer, hazeldenbettyford, petsmart, petsuppliesplus, covetrus, brookshirebrothers).

### 3.1 LegitScript certification — the actual 9 standards (from their official PDF)

1. **Licensure** in every jurisdiction served (where you operate AND where the patient is)
2. **Legal compliance** — no unapproved products/drugs
3. **Prior discipline disclosure** — 10-year lookback on principals/practitioners
4. **Affiliates & partners** must also comply; fulfillment partners generally need their own certification; disclose ALL domains you control
5. **Patient services** — website must clearly display **which states/territories services are available in**
6. **Privacy** — posted privacy policy, HIPAA compliance where PHI flows, SSL on all transactions
7. **Valid prescriptions** — licensed clinician provides care BEFORE any prescribing (no questionnaire-only prescribing)
8. **Transparency** — no health claims unsupported by FDA/FTC; accurate practitioner/pricing info
9. **Advertising** — accurate, identifies the merchant, respects platform ToS

Practicals: ~$975 application + $2,150/yr per domain; each domain certified separately; wireframe/demo sites acceptable to start review; seal display optional but standard practice (4 of 6 telehealth competitors show it in footer).

**Design consequences for us:**
- Build a **state-availability disclosure** into the telemedicine pages (and later, state-gated product shipping)
- Keep v1 catalog **OTC/devices/wellness only** — avoids pharmacy-tier requirements
- Footer carries LegitScript seal slot + legal entity name + physical address sitewide
- Product copy pipeline must block unsubstantiated health claims (editorial policy + review step)

### 3.2 Site architecture patterns (near-universal across competitors)

- **Navigate by condition/health category, not "products vs services."** Products and telehealth live inside the same vertical (Weight, Heart Health, Sexual Health…). This is how LifeMD, Everlywell, Noom, Maven all structure nav.
- **Three-layer portal pattern** (every provider org): public SEO site → persistent top-right login → authenticated app on a separate hostname. Cedars-Sinai even 301-redirects its telemedicine subdomain back to the public landing page for logged-out visitors — **the public site always owns the SEO landing page for telemedicine**. We follow this exactly: `/telemedicine` landing page on our domain, CTA links out to the existing app.
- **Portal help content lives public and indexed** (Geisinger's MyChart help pages are SEO pages). We should host "how to use our telemedicine service" content publicly.
- **Care-first vs product-first funnels** both work: LifeMD (consult → products fulfill through it) vs Everlywell (buy product → care upsells after). Ours is product-first ecommerce + link-out care in v1, converging later via SSO.

### 3.3 SEO playbook (what the winners do)

- **Titles:** `{keyword phrase} | {Brand}` — "Thyroid Test Kit | TSH, Free T3, Free T4 | Everlywell"
- **JSON-LD baseline:** `MedicalOrganization` + `WebSite` + `ContactPoint` sitewide (only Maven and Thriveworks do this — open opportunity)
- **Product pages — copy Everlywell (best-in-class):** `Product` + `Offer` + `AggregateRating` + `Review` + `FAQPage` + `MerchantReturnPolicy` + **`OfferShippingDetails` with state-level `DefinedRegion`** (regulated-product shipping eligibility in structured data)
- **Category pages — copy PetSmart:** full `Product`+`Offer` schema on all listed items (not just PDPs), `BreadcrumbList`, path-encoded crawlable facets (`/f/{attr}/{value}`), strict canonical discipline (one canonical product path, 308s collapse alternates)
- **Content moat:** every winner runs a category-structured learn center/blog with E-E-A-T bylines ("Medically reviewed by Dr. X"), plus **free interactive tools** (calculators, quizzes, eligibility checkers) as top-of-funnel assets — Noom's calculators, Thriveworks' copay estimator, JumpstartMD's BMI/TDEE tools
- **Per-entity landing pages:** per-product, per-condition, per-state (and later per-insurer) pages are the organic engines at LifeMD, Thriveworks, JumpstartMD
- **Anti-patterns confirmed in the wild:** Noom's JS-only homepage serves nothing to crawlers; Brookshire's SPA shop is invisible to search — **server-rendering is non-negotiable**; also: don't let staging hosts get indexed (HealthSmart's uat host is), don't hard-code portal hostnames in content (HealthSmart's dead members subdomain)

### 3.4 Trust/footer stack (table stakes — every certified site has these)

Separate **Notice of Privacy Practices (HIPAA NPP)** distinct from the website Privacy Policy · Telehealth Consent · Terms · Refund/Shipping policies · Accessibility statement · Nondiscrimination notice · Consumer Health Data Privacy Notice (WA/CA state laws) · "Your Privacy Choices" control · Editorial policy · About with real legal entity + leadership · Contact with physical address + phone · State-availability page · LegitScript seal · specific-number social proof ("745K patients", "28,740 reviews") once real.

### 3.5 Ecommerce merchandising (from PetSmart/PSP)

- **Subscription/autoship as the primary conversion lever** — tiered first-order discounts (PetSmart: 40/20/10% first three orders), surfaced on PDP + as a facet + in account. Health products are naturally replenishable — plan Medusa subscriptions in Phase 2+.
- Free-shipping threshold messaging on every PDP; guest checkout + guest order tracking
- Brand/collection landing pages as merchandising + SEO surfaces
- Compliance metadata on product records: `fda_status`, `usage_warnings`, `active_ingredients`, `requires_age_verification`, state-shipping eligibility

---

## 4. Site Map (v1)

```
/                          homepage (condition-vertical entry points)
/[condition]/              health-category hubs (weight, heart, sleep…) — products + content + care CTA
/products/[handle]         ISR product pages (Everlywell-grade schema)
/categories/[...slug]      ISR category pages (PetSmart-grade schema, crawlable facets)
/telemedicine              SEO landing page for the existing telemedicine app (link-out CTA, how-it-works, state availability)
/learn/[category]/[slug]   blog/learn center (E-E-A-T bylines, medical reviewer, citations)
/tools/[calculator]        free interactive tools (BMI, etc.) — top-of-funnel SEO
/about /contact /licensing state availability + provider licensing
/legal/*                   privacy-policy, notice-of-privacy-practices, terms, telehealth-consent,
                           refund-policy, shipping-policy, medical-disclaimer, accessibility,
                           editorial-policy, nondiscrimination
/cart /checkout /account   dynamic, noindex
```

**Admin (staff-only): `manage.saludlinkusa.com`** — single management subdomain, noindex + WAF/IP-restricted:
- Medusa Admin → inventory, orders, deals/promotions, catalog
- Payload admin (routed at `/content` via CloudFront) → main content, blog, legal pages

Footer sitewide: legal entity + physical address, LegitScript seal slot, full legal link set.

---

## 5. Delivery Phases

**Phase 1 — Scaffold + marketing site + SEO foundation**
Monorepo init · Medusa v2 scaffold · storefront from Medusa Next.js Starter (keep cart/checkout plumbing, rebuild marketing) · Payload CMS (posts, authors, legalPages, faqs collections) · all trust/legal pages (draft copy) · JSON-LD library (`schema-dts`) · sitemap/robots/OG images · security headers · `/telemedicine` landing page with link-out · CI with Lighthouse budgets (Perf ≥95, SEO=100, LCP <2.0s, CLS <0.05).

**Phase 2 — Ecommerce**
Real catalog with compliance metadata · ISR product/category pages with full schema (Everlywell/PetSmart-grade) · restyled cart/checkout, guest checkout · signed revalidation webhooks · SES order emails · Playwright checkout e2e · groundwork for subscriptions/autoship.

**Phase 3 — Auth + accounts + SSO prep**
Cognito (Terraform) · custom auth UI, httpOnly sessions · Medusa Cognito auth provider · account area (orders, addresses) · "Start a visit" link-out → future SSO redirect · JWT claims contract in `packages/types` + `docs/sso-integration.md` for the telemedicine & EMR teams · audit-log module.

**Phase 4 — AWS production hardening**
Full Terraform footprint (staging → prod) · Dockerfiles + migration tasks · deploy pipelines with prod approval gate · WAF + rate limits + alarms · k6 load test · OWASP ZAP baseline · failover/restore drills · **sign AWS BAA** · go live.

**Post-launch:** LegitScript application (needs live policies + real entity docs) · subscriptions/autoship · interactive tools buildout · per-condition/per-state landing-page expansion · telemedicine SSO.

---

## 6. Verification Gates

- **Phase 1:** Lighthouse CI budgets in GitHub Actions; Google Rich Results Test on all JSON-LD; securityheaders.com grade A; sitemap/robots validation
- **Phase 2:** Playwright e2e browse→cart→Stripe test checkout→confirmation (incl. 3DS); ISR revalidation test (admin edit → live page update)
- **Phase 3:** auth e2e; standalone JWKS validation script proving the telemedicine/EMR SSO path; no tokens in localStorage
- **Phase 4:** clean `terraform plan` in CI; ZAP baseline on staging; k6 checkout p95 <800ms @ 50 RPS; ECS/RDS failover + backup-restore drills; PageSpeed Insights on production URLs
