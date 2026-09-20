# Storefront end-to-end tests (Playwright)

Browser-level coverage for the Saludlink storefront. The suite is a **route +
content contract**: if a page is removed, a slug renamed, or the nav/footer
restructured without updating both places, a test fails.

## What's covered

| Spec                    | Surface                                                                               |
| ----------------------- | ------------------------------------------------------------------------------------- |
| `home.spec.ts`          | Hero, CTAs, marketing sections, condition grid, JSON-LD                               |
| `navigation.spec.ts`    | Header nav, footer link stack, logo, account/cart links, mobile menu                  |
| `conditions.spec.ts`    | Conditions hub + all 4 vertical hubs + unknown-slug 404                               |
| `content-pages.spec.ts` | About, Contact, Licensing, Telemedicine (FAQ, availability, CTAs)                     |
| `legal.spec.ts`         | `@commerce` — all 10 LegitScript trust documents (CMS-sourced; needs Medusa)          |
| `i18n.spec.ts`          | Locale redirect middleware, `<html lang>`, Spanish chrome, language switcher + cookie |
| `seo.spec.ts`           | `robots.txt`, `sitemap.xml`, OpenGraph image, canonical + hreflang alternates         |
| `commerce.spec.ts`      | `@commerce` — store, cart, account/login/register (needs Medusa)                      |

> **Backend-gated specs.** The 10 legal pages are now rendered by `/legal/[slug]`,
> which pulls body content from the Medusa **content module**
> (`/store/content/pages/<slug>`) and returns 404 when that content isn't seeded.
> They are therefore tagged `@commerce` alongside store/cart/account and only run
> via `test:e2e:commerce`.

Every page assertion checks: HTTP 2xx, no error boundary, a single non-empty
`<h1>`, and a meaningful `<title>`.

## Running

```bash
# one-time: download the Chromium browser
pnpm --filter @saludlink/storefront test:e2e:install

# run the backend-free suite (boots `next dev` on :8000 automatically)
pnpm --filter @saludlink/storefront test:e2e

# interactive UI mode / headed / last HTML report
pnpm --filter @saludlink/storefront test:e2e:ui
pnpm --filter @saludlink/storefront test:e2e:headed
pnpm --filter @saludlink/storefront test:e2e:report
```

### Commerce specs

Store / cart / account pages need a **seeded Medusa backend** reachable via
`NEXT_PUBLIC_MEDUSA_BACKEND_URL`. They're tagged `@commerce` and excluded by
default. With the backend up:

```bash
pnpm --filter @saludlink/storefront test:e2e:commerce
```

## Configuration

- `PLAYWRIGHT_BASE_URL` — test against an already-running instance (e.g. a
  preview deploy). When set, Playwright does **not** boot its own dev server.
- `STOREFRONT_PORT` — dev-server port (default `8000`).
- `E2E_INCLUDE_COMMERCE=1` — include `@commerce` specs (what `test:e2e:commerce`
  sets).

Traces (on first retry), screenshots + video (on failure), and the HTML report
are written to `e2e/.artifacts/` (git-ignored).

## Design notes

- Marketing / legal / SEO / i18n pages render for an **anonymous** visitor
  without Medusa — cart + customer lookups short-circuit to `null` when there's
  no session cookie. Those specs run with the storefront alone.
- Route + slug lists live in `support/routes.ts`, deliberately mirrored (not
  imported) from `src/lib/config/site.ts`.
- Assertions prefer stable `data-testid` hooks and ARIA roles over copy, except
  where the copy itself is the thing under test (e.g. Spanish chrome).
