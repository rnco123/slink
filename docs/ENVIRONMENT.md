# Environment Contract

_Roadmap tasks 60 (env contract) + 74 (boot validation). Keep this file, the
`.env.template`s, and the zod schemas in `src/lib/env.ts` in lockstep — the
drift check (`pnpm check:env`) fails CI if a validated variable is missing from
a template._

Every service validates its environment **at boot** with zod and refuses to
start on a misconfiguration, naming the offending variable:

- **Storefront** — `apps/storefront/src/lib/env.ts`, invoked from
  `src/instrumentation.ts` (`register()` runs once at server start). Build-time
  public vars are additionally guarded by `check-env-variables.js`.
- **Medusa** — `apps/medusa/src/lib/env.ts`, invoked from `medusa-config.ts`
  after `loadEnv()`. Runs on every entrypoint (server, worker, build, migrate);
  production-strict rules apply only on a real server boot, not build/migrate.

Rule of thumb: **lenient in development** (local defaults keep a fresh checkout
booting), **strict in production** (real secrets, https, no localhost).

---

## Storefront (`apps/storefront/.env.local`)

| Variable                               | Required         | Rule / Notes                                                           |
| -------------------------------------- | ---------------- | ---------------------------------------------------------------------- |
| `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`   | **always**       | Must start with `pk_`. Baked into the bundle at build time.            |
| `MEDUSA_BACKEND_URL`                   | no               | Server→Medusa base URL. Valid URL if set.                              |
| `NEXT_PUBLIC_BASE_URL`                 | **prod**         | Public origin (canonicals/sitemap/robots). Must be `https://` in prod. |
| `NEXT_PUBLIC_DEFAULT_REGION`           | no               | ISO-2 lowercase (e.g. `us`).                                           |
| `COMING_SOON`                          | no               | `true`/`false`. Wall is ON in every env by decision (task 82).         |
| `PREVIEW_CODE`                         | if `COMING_SOON` | 6 digits. Required when the wall is on, else no one can unlock it.     |
| `REVALIDATE_SECRET`                    | **prod**         | On-demand ISR secret. Must not be the `supersecret` default in prod.   |
| `NEXT_PUBLIC_STRIPE_KEY`               | no               | Stripe publishable key (`pk_...`) if set.                              |
| `NEXT_PUBLIC_POSTHOG_KEY`              | no               | Empty disables analytics entirely.                                     |
| `NEXT_PUBLIC_POSTHOG_HOST`             | no               | Dashboard link-back host. Valid URL if set.                            |
| `POSTHOG_INGEST_HOST` / `_ASSETS_HOST` | no               | Reverse-proxy targets (`/ingest`). Valid URLs if set.                  |

## Medusa (`apps/medusa/.env`)

| Variable                                                                        | Required    | Rule / Notes                                                       |
| ------------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------ |
| `NODE_ENV`                                                                      | no          | `development` \| `production` \| `test`. Default `development`.    |
| `DATABASE_URL`                                                                  | **prod**    | Postgres. In prod must be set and **not** localhost.               |
| `REDIS_URL`                                                                     | recommended | Event bus / workflows / cache. In-memory fallback in dev only.     |
| `JWT_SECRET`, `COOKIE_SECRET`                                                   | **prod**    | ≥16 chars, not `supersecret`. From Secrets Manager in prod.        |
| `STORE_CORS` / `ADMIN_CORS` / `AUTH_CORS`                                       | **prod**    | Comma-separated origins; must be `https://` in prod.               |
| `MEDUSA_BACKEND_URL`                                                            | no          | Public backend URL. Valid URL if set.                              |
| `STRIPE_API_KEY`                                                                | no          | `sk_test_`/`sk_live_`/`rk_...`. Enables the Stripe provider.       |
| `STRIPE_WEBHOOK_SECRET`                                                         | if Stripe   | Required whenever `STRIPE_API_KEY` is set.                         |
| `S3_FILE_URL` `S3_BUCKET` `S3_REGION` `S3_ACCESS_KEY_ID` `S3_SECRET_ACCESS_KEY` | all-or-none | Partial S3 config is rejected (would silently fall back to local). |
| `SES_FROM` + `SES_REGION`/`AWS_REGION`                                          | together    | `SES_FROM` without a region is rejected (silent local fallback).   |

---

## Provider enablement (all-or-nothing)

Optional providers only activate when **all** of their variables are present;
otherwise the app falls back to the built-in local/no-op provider. The boot
validator rejects a **partial** configuration so a typo can't silently disable
Stripe/S3/SES in production.

## Drift check

`pnpm check:env` (also a CI step) parses each zod schema and its matching
`.env.template`, and **fails** if a validated variable is undocumented in the
template. Passthrough template keys that the code reads directly (not validated)
are allowed and reported as info only.

## Production secrets

In production these come from **AWS SSM Parameter Store / the box `.env`**, never
from committed files. Rotate `JWT_SECRET`, `COOKIE_SECRET`, `REVALIDATE_SECRET`,
and any Stripe/SES/S3 credentials per `docs/RUNBOOK.md`.
