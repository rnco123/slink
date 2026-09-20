# Environment Contract

_Roadmap tasks 60 (env contract) + 74 (boot validation). Keep this file, the
`.env.template`s, and the zod schemas in `src/lib/env.ts` in lockstep — the
drift check (`pnpm check:env`) fails CI if a validated variable is missing from
a template._

Every service validates its environment **at boot** with zod and refuses to
start on a misconfiguration, naming the offending variable:

- **Storefront** — `storefront/src/lib/env.ts`, invoked from
  `src/instrumentation.ts` (`register()` runs once at server start). Build-time
  public vars are additionally guarded by `check-env-variables.js`.
- **Medusa** — `backend/src/lib/env.ts`, invoked from `medusa-config.ts`
  after `loadEnv()`. Runs on every entrypoint (server, worker, build, migrate);
  production-strict rules apply only on a real server boot, not build/migrate.

Rule of thumb: **lenient in development** (local defaults keep a fresh checkout
booting), **strict in production** (real secrets, https, no localhost).

---

## Storefront (`storefront/.env.local`)

| Variable                               | Required         | Rule / Notes                                                               |
| -------------------------------------- | ---------------- | -------------------------------------------------------------------------- |
| `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`   | **always**       | Must start with `pk_`. Baked into the bundle at build time.                |
| `MEDUSA_BACKEND_URL`                   | no               | Server→Medusa base URL. Valid URL if set.                                  |
| `NEXT_PUBLIC_SUPABASE_URL`             | no               | Supabase project URL (e.g. `https://xxx.supabase.co`).                     |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | no               | Supabase publishable key (`sb_publishable_...`). Legacy anon JWT rejected. |
| `NEXT_PUBLIC_BASE_URL`                 | **prod**         | Public origin (canonicals/sitemap/robots). Must be `https://` in prod.     |
| `NEXT_PUBLIC_DEFAULT_REGION`           | no               | ISO-2 lowercase (e.g. `us`).                                               |
| `COMING_SOON`                          | no               | `true`/`false`. Wall is OFF in prod since launch; on elsewhere (t82).      |
| `PREVIEW_CODE`                         | if `COMING_SOON` | 6 digits. Required when the wall is on, else no one can unlock it.         |
| `REVALIDATE_SECRET`                    | **prod**         | On-demand ISR secret. Must not be the `supersecret` default in prod.       |
| `NEXT_PUBLIC_POSTHOG_KEY`              | no               | Empty disables analytics entirely.                                         |
| `NEXT_PUBLIC_POSTHOG_HOST`             | no               | Dashboard link-back host. Valid URL if set.                                |
| `POSTHOG_INGEST_HOST` / `_ASSETS_HOST` | no               | Reverse-proxy targets (`/ingest`). Valid URLs if set.                      |

## Medusa (`backend/.env`)

| Variable                                                                              | Required    | Rule / Notes                                                                                                                                                                                                                             |
| ------------------------------------------------------------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NODE_ENV`                                                                            | no          | `development` \| `production` \| `test`. Default `development`.                                                                                                                                                                          |
| `DATABASE_URL`                                                                        | **prod**    | Postgres / Supabase (Direct: port 5432, Pooler: port 6543/5432). In prod must be set and **not** localhost.                                                                                                                              |
| `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY` / `SUPABASE_SECRET_KEY`                   | no          | Supabase platform credentials. Current API keys (`sb_publishable_...` / `sb_secret_...`); legacy anon / service_role JWTs are rejected.                                                                                                  |
| `REDIS_URL`                                                                           | recommended | Event bus / workflows / cache. In-memory fallback in dev only.                                                                                                                                                                           |
| `JWT_SECRET`, `COOKIE_SECRET`                                                         | **prod**    | ≥16 chars, not `supersecret`. From Railway variables in prod.                                                                                                                                                                            |
| `STORE_CORS` / `ADMIN_CORS` / `AUTH_CORS`                                             | **prod**    | Comma-separated origins; must be `https://` in prod.                                                                                                                                                                                     |
| `MEDUSA_BACKEND_URL`                                                                  | no          | Public backend URL. Valid URL if set.                                                                                                                                                                                                    |
| `S3_FILE_URL` `S3_BUCKET` `S3_REGION` `S3_ACCESS_KEY_ID` `S3_SECRET_ACCESS_KEY`       | all-or-none | Supabase Storage (S3 protocol). Partial config is rejected (would silently fall back to local).                                                                                                                                          |
| `S3_ENDPOINT`                                                                         | if Supabase | `https://[ref].supabase.co/storage/v1/s3`. Passthrough (not validated).                                                                                                                                                                  |
| `BANK_TRANSFER_BANK_NAME` `BANK_TRANSFER_ACCOUNT_NAME` `BANK_TRANSFER_ACCOUNT_NUMBER` | no          | **Fallback only.** Source of truth is the `bank_transfer` site setting, edited in Admin → Site Settings (no redeploy). Admin wins field by field; checkout blocks ordering while any of the three is blank.                              |
| `BANK_TRANSFER_ROUTING_NUMBER` / `BANK_TRANSFER_INSTRUCTIONS`                         | no          | Fallback for the same setting. Shown alongside the account details at checkout.                                                                                                                                                          |
| `MCM_INTEGRATION_TOKEN`                                                               | no          | Shared bearer token for the MCM-Go read API (`/integrations/mcm/*`). `openssl rand -hex 32`, min 32 chars, same value both sides. **Fails closed** — while unset every request to that surface gets 401; it never falls through to open. |
| `RESEND_API_KEY` + `RESEND_FROM`                                                      | together    | `RESEND_FROM` without a key is rejected (silent local fallback). Key must start `re_`.                                                                                                                                                   |

---

## Provider enablement (all-or-nothing)

Optional providers only activate when **all** of their variables are present;
otherwise the app falls back to the built-in local/no-op provider. The boot
validator rejects a **partial** configuration so a typo can't silently disable
storage/Resend in production.

## Drift check

`pnpm check:env` (also a CI step) parses each zod schema and its matching
`.env.template`, and **fails** if a validated variable is undocumented in the
template. Passthrough template keys that the code reads directly (not validated)
are allowed and reported as info only.

## Production secrets

In production these come from **Railway service variables** (per environment),
never from committed files. Rotate `JWT_SECRET`, `COOKIE_SECRET`,
`REVALIDATE_SECRET`, and any Resend/storage credentials per
[`infra/monitoring/docs/secrets-rotation.md`](../infra/monitoring/docs/secrets-rotation.md).
