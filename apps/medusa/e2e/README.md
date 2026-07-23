# Medusa admin UI — Playwright suite (task 23)

End-to-end tests for the **custom admin sections** built on the Medusa dashboard:

- **Content & Policies** (`/app/content`) — the mini-CMS editor (`content.spec.ts`)
- **Product Reviews** (`/app/product-reviews`) — the moderation queue (`reviews.spec.ts`)

This is separate from the storefront suite (`apps/storefront/e2e`) and has its own
`playwright.config.ts` + fixtures.

## What it does / doesn't cover

These specs drive a **real, running admin** and authenticate as the seeded owner.
They are **non-destructive**: they assert the sections render and are operable
(open the page editor, switch the reviews filter) without persisting to the shared
dev DB.

The behavioural contracts — content create/update/delete + published-only reads,
and the review submit → pending → approve → visible **moderation gate** — are
verified against a throwaway DB by the HTTP integration suite (task 24):
`integration-tests/http/content-crud.spec.ts` and `product-reviews.spec.ts`.

## Running

Because it needs a running, seeded backend, this suite is **opt-in** (like the
storefront's `@commerce` suite) and is not part of the default CI unit/integration
lane.

```bash
# 1) Install the browser once
pnpm --filter @saludlink/medusa test:e2e:admin:install

# 2) Start the admin (separate terminal), seeded with the owner + demo data
pnpm --filter @saludlink/medusa dev

# 3) Run the suite
pnpm --filter @saludlink/medusa test:e2e:admin
```

### Configuration (env)

| Var                   | Default                       | Purpose                                     |
| --------------------- | ----------------------------- | ------------------------------------------- |
| `ADMIN_BASE_URL`      | `http://localhost:9000`       | Point at an already-running admin           |
| `MEDUSA_PORT`         | `9000`                        | Port when `ADMIN_BASE_URL` is unset         |
| `ADMIN_EMAIL`         | `owner@saludlinkusa.com`      | Login used by `global-setup`                |
| `ADMIN_PASSWORD`      | _(required — set in .env/CI)_ | Login password (never hardcoded in source)  |
| `ADMIN_MANAGE_SERVER` | _(unset)_                     | `1` → let Playwright boot `pnpm dev` itself |

`global-setup.ts` logs in once through the real login form and saves an
authenticated storage state to `.artifacts/admin-state.json`, which every spec
reuses. If the admin isn't reachable it fails with an actionable message.
