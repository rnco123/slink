# Saludlink — End-to-End Task List (T1 … TN)

Brand **Saludlink** · domain **saludlinkusa.com** · admin **manage.saludlinkusa.com**
Design direction: **editorial / premium wellness** (serif display, warm neutrals + deep green, photography-led)
Single repo · monorepo (`apps/storefront`, `apps/medusa`, `packages/*`)
**Design-first**: nothing gets built until its design is locked.

Legend: ☐ not started · ◐ in progress · ☑ done

---

## PHASE 0 — DESIGN (do this first, before feature code)

- ☐ **T1. Brand foundation.** Lock Saludlink identity: logo/wordmark direction, color system (deep green primary, warm cream/sand neutrals, semantic states), the editorial type pairing (serif display + clean sans body), spacing scale, radius, elevation, motion principles. Output: `packages/ui/tokens` (CSS variables + Tailwind theme) + a one-page brand sheet.
- ☐ **T2. Design system / component library.** Design the core components as a system, not one-offs: buttons, inputs, cards (product, article, condition), nav/header, mega-footer (the LegitScript trust stack), badges/seals, price + subscription selector, breadcrumbs, tabs, accordions (FAQ). Delivered as a living style guide page.
- ☐ **T3. Page designs — high-fidelity, unique (not template).** Design each key screen in the editorial language:
  - Homepage (condition-vertical entry, hero, trust band, featured products, learn teasers)
  - Condition hub (`/[condition]`)
  - Product detail page (Everlywell-grade: gallery, subscription-first buy box, schema-driven FAQ, reviews, shipping/compliance info)
  - Category / listing page (crawlable facets, PetSmart-grade)
  - Telemedicine landing page (how-it-works, state availability, link-out CTA)
  - Learn center index + article (E-E-A-T byline, medical-reviewer block, citations)
  - Cart · checkout · account
  - Legal/trust page template
- ☐ **T4. Design review & sign-off.** Walk the designs against the 8 website learnings + LegitScript display rules. Lock before building.

## PHASE 1 — FOUNDATION (scaffold, already begun)

- ◐ **T5. Monorepo skeleton.** pnpm workspaces + Turborepo + gitignore + docker-compose (Postgres 16 + Redis 7). *(done)*
- ☐ **T6. Install & boot both apps.** Storefront (Next.js 15) + Medusa v2 backend install cleanly under pnpm; both dev servers run; admin loads at `/app`.
- ☐ **T7. Shared packages.** `packages/config-typescript`, `packages/types` (incl. future SSO JWT claims contract), `packages/ui` (design tokens from T1).
- ☐ **T8. Apply design system to storefront.** Wire T1/T2 tokens + components into the storefront; strip the starter's demo styling.

## PHASE 2 — MARKETING SITE + SEO FOUNDATION

- ☐ **T9. Payload CMS embedded** in the storefront (collections: `posts`, `authors`, `legalPages`, `faqs`, `conditions`), on its own DB. Admin reachable for content editing.
- ☐ **T10. Global layout** — header (condition nav) + mega-footer (full LegitScript trust stack, legal entity, address, seal slot).
- ☐ **T11. Marketing pages** — homepage, condition hubs, about, contact, licensing/state-availability.
- ☐ **T12. Telemedicine landing page** with how-it-works, state-availability disclosure, UTM-tagged link-out to the existing app.
- ☐ **T13. Learn center** — index + article template with E-E-A-T byline, medical-reviewer, citations.
- ☐ **T14. Legal/trust pages** (CMS-driven): privacy-policy, **notice-of-privacy-practices**, terms, telehealth-consent, refund-policy, shipping-policy, medical-disclaimer, accessibility, editorial-policy, nondiscrimination.
- ☐ **T15. SEO infrastructure** — `generateMetadata` everywhere, canonicals, JSON-LD library (`MedicalOrganization`, `Product`, `FAQPage`, `Article`, `BreadcrumbList` via `schema-dts`), `sitemap.ts`, `robots.ts`, OG images.
- ☐ **T16. Security headers** — strict CSP, HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy.
- ☐ **T17. Free tools** (top-of-funnel SEO) — start with 1–2 calculators (e.g. BMI/health), designed per T2.

## PHASE 3 — ECOMMERCE

- ☐ **T18. Catalog modeling** in Medusa — categories as primary tree, condition tags, compliance metadata (`fda_status`, `usage_warnings`, `active_ingredients`, `requires_age_verification`, state-shipping eligibility). Seed real sample catalog.
- ☐ **T19. Product pages (ISR)** — Everlywell-grade structured data, breadcrumbs, subscription-first buy box, reviews, FAQ.
- ☐ **T20. Category/listing pages (ISR)** — crawlable path-encoded facets, category schema, strict canonicals.
- ☐ **T21. Cart & checkout** — restyle starter flow to design system, guest checkout + guest order tracking.
- ☐ **T22. Stripe** (test mode) wired through Medusa; 3DS handled.
- ☐ **T23. Subscriptions/autoship** — tiered first-order discount merchandising.
- ☐ **T24. Deals/promotions** — configure in Medusa admin (this is the "deals" management you asked for).
- ☐ **T25. Order emails via SES** + on-demand ISR revalidation webhook (Medusa → storefront, signed).
- ☐ **T26. Checkout e2e test** (Playwright): browse → cart → Stripe test card → confirmation.

## PHASE 4 — AUTH, ACCOUNTS & ADMIN CONSOLIDATION

- ☐ **T27. AWS Cognito** user pool (Terraform) — app clients `storefront` + reserved `telemedicine`/`emr` for future SSO.
- ☐ **T28. Auth UI** — register/login/verify/reset, httpOnly cookie sessions, middleware refresh (design per T2).
- ☐ **T29. Medusa Cognito auth provider** — JWKS validation, `sub` → customer mapping.
- ☐ **T30. Account area** — orders, addresses, subscriptions, profile; "Start a visit" link-out (future SSO redirect).
- ☐ **T31. `manage.saludlinkusa.com`** — unified admin surface: Medusa admin (inventory, orders, deals) + Payload (content), noindex + access-restricted.
- ☐ **T32. SSO contract** — JWT claims in `packages/types` + `docs/sso-integration.md` for the telemedicine & EMR teams.
- ☐ **T33. Audit-log module** in Medusa (append-only actor/action/entity/timestamp — HIPAA hook).

## PHASE 5 — AWS PRODUCTION & COMPLIANCE

- ☐ **T34. Terraform footprint** (staging → prod): VPC, RDS Postgres 16 Multi-AZ (medusa + payload DBs), ElastiCache Redis, ECS Fargate (storefront + medusa server + worker), ALB, CloudFront, WAF, Route53, ACM, Secrets Manager, SES, CloudTrail/Config/GuardDuty. All BAA-eligible.
- ☐ **T35. Dockerfiles** (Next standalone; Medusa server + worker) + DB migration tasks.
- ☐ **T36. CI/CD** — GitHub Actions with AWS OIDC; Lighthouse budgets (Perf ≥95, SEO 100), gitleaks + Trivy; staging auto-deploy, prod approval gate.
- ☐ **T37. Hardening** — WAF rate rules, alarms → SNS, k6 checkout load test, OWASP ZAP baseline, failover + backup-restore drills.
- ☐ **T38. Analytics** — self-hosted Plausible, consent-gated, no PHI.
- ☐ **T39. Sign AWS BAA** (via Artifact) before real customer data.
- ☐ **T40. LegitScript application** — submit with live policies, state-availability page, real legal-entity docs; add seal to footer on approval.

---

### Verification gates (per phase)
- **Design:** every screen reviewed against the 8 learnings + LegitScript display rules before code.
- **Phase 2:** Lighthouse (Perf ≥95, SEO 100, LCP <2.0s, CLS <0.05); Google Rich Results passes; securityheaders.com grade A.
- **Phase 3:** Playwright checkout e2e; ISR revalidation (admin edit → live update).
- **Phase 4:** auth e2e; standalone JWKS script proving the telemedicine/EMR SSO path.
- **Phase 5:** clean `terraform plan`; ZAP baseline; k6 p95 <800ms @ 50 RPS; failover/restore drills.
