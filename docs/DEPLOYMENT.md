# Deployment pipeline

**Goal:** you `git push` (or merge a PR) to `main`, and the live site updates
itself. No manual steps, no SSH, nobody in the loop.

This document describes the whole pipeline end-to-end, the **one-time setup** you
run once, and how to roll back / troubleshoot.

Platform: **Railway** for compute, **Supabase** for Postgres. There is no AWS
account, no EC2 box, no Terraform footprint and no self-hosted runner.

---

## 1. The big picture

```
  you ── merge PR ──▶ main
                       │
                       ▼
              ┌──────────────────┐   GitHub-hosted runner (free, ephemeral)
              │  CI  (ci + e2e)  │   typecheck · lint · tests · build
              └────────┬─────────┘
                       │ green? (branch protection blocks merge otherwise)
                       ▼
              ┌──────────────────┐   GitHub-hosted runner
              │ deploy: images   │   build 2 Docker images → push to GHCR
              └────────┬─────────┘
                       │
                       ▼
              ┌──────────────────┐   GitHub-hosted runner → Railway API
              │ deploy: roll     │   railway redeploy (medusa → worker → store)
              └────────┬─────────┘   + health checks
                       ▼
                  live site updated
```

| Piece                             | Hosted on                           | Notes                       |
| --------------------------------- | ----------------------------------- | --------------------------- |
| storefront, medusa, worker, redis | **Railway** services in one project | TLS + domains are Railway's |
| Postgres                          | **Supabase** (`DATABASE_URL`)       | PITR / backups are Supabase |
| Object storage (uploads)          | **Supabase Storage** (S3 protocol)  | see `S3_*` in ENVIRONMENT   |
| Transactional email               | **Resend**                          | BAA required before go-live |
| Container images                  | GHCR (`ghcr.io/rnco123/slink-*`)    | free (public repo)          |
| CI + image builds                 | GitHub-hosted runners               | free (public repo)          |

**Why Railway pulls from GHCR rather than building from the repo:** the image
builds are already tuned for layer caching against GHCR (`:buildcache`, `mode=max`),
so a code-only change re-uses the dependency layers instead of reinstalling. The
`deploy` job pushes `:latest`, then asks Railway to redeploy, which pulls it.

**Why no self-hosted runner any more:** there is no box to install one on.
The deploy job runs on a GitHub-hosted runner and authenticates to Railway with a
project token, so nothing inbound is ever opened.

---

## 2. The workflows

- **`.github/workflows/ci.yml`** — format, lint, typecheck, build, unit +
  integration tests. **`.github/workflows/e2e.yml`** — Playwright. These are the
  quality gate.
- **`.github/workflows/deploy.yml`** — builds the images and rolls Railway. Two
  jobs:
  - `images` (GitHub-hosted): builds `slink-medusa` + `slink-storefront`, pushes
    `:latest` and `:<commit-sha>` to GHCR.
  - `deploy` (GitHub-hosted): `railway redeploy` for `medusa`, then `worker`,
    then `storefront`, with a health check after each of the two public services.

`deploy` is gated on `ci` succeeding — **not** on security / meta-lint / knip /
lighthouse. Those fail on upstream advisories and tooling config (a stranger
publishing a CVE in a transitive dep, a linter not knowing a label) and must
never block shipping a working site. They still run and still report.

---

## 3. ONE-TIME setup (you run this once)

### 3a. Create the Railway project and services

In a Railway project (one environment per stage — `production`, optionally
`staging`), create four services:

| Service      | Source                                                 | Notes                                     |
| ------------ | ------------------------------------------------------ | ----------------------------------------- |
| `medusa`     | Docker image `ghcr.io/rnco123/slink-medusa:latest`     | public domain → `manage.saludlinkusa.com` |
| `worker`     | Docker image `ghcr.io/rnco123/slink-medusa:latest`     | **no** public domain                      |
| `storefront` | Docker image `ghcr.io/rnco123/slink-storefront:latest` | public domain → `saludlinkusa.com`        |
| `redis`      | Railway's Redis template                               | private networking only                   |

The repo is public, so GHCR pulls need no registry credentials. If the packages
are ever made private, add a GHCR username + PAT to each service's source.

Service-specific variables:

- `medusa` — `MEDUSA_WORKER_MODE=server`, `HOME=/tmp`
- `worker` — `MEDUSA_WORKER_MODE=worker`, `MEDUSA_ADMIN_DISABLE=true`, `HOME=/tmp`

`HOME=/tmp` is required: the image's `medusa` user has no home directory, so the
Medusa CLI's `mkdir ~/.config/medusa` fails with `EACCES` without it.

Point `REDIS_URL` at the Redis service over Railway's private network — reference
it as `${{Redis.REDIS_URL}}` so it tracks the plugin rather than being pasted.

### 3b. Set the Pre-Deploy Command on `medusa`

This is the piece that replaces the old `medusa-migrate` one-shot container and
the post-deploy `docker compose exec` steps. In the `medusa` service →
**Settings → Deploy → Pre-Deploy Command**, set:

```sh
npx medusa db:migrate && SEED_CONTENT_FORCE=1 npx medusa exec ./src/scripts/seed-content.js && npx medusa exec ./src/scripts/migrate-catalog-rx.js && PRODUCT_IMAGE_BASE=https://saludlinkusa.com/products npx medusa exec ./src/scripts/attach-images.js
```

Railway runs this **once per deploy, before the new version takes traffic**, in a
container with the service's own variables. In order it:

1. applies DB migrations;
2. syncs legal/policy content from code (see §4b);
3. ensures the compounded-Rx catalog exists (idempotent — creates only what's
   missing, and removes the legacy OTC catalog if present);
4. attaches product artwork where a product has no image yet (non-destructive:
   real photography uploaded through Admin is never reverted).

The image ships the **built** server, so these are compiled `.js` paths, not `.ts`.

Set no Pre-Deploy Command on `worker` or `storefront` — running migrations from
more than one service races them.

### 3c. Set the variables

Copy each app's `.env.template` into the Railway service variables and fill in
real values (see `docs/ENVIRONMENT.md` for the full contract, including which
variables are required in production). The ones with no local default:

`DATABASE_URL` (Supabase), `JWT_SECRET`, `COOKIE_SECRET`, `REVALIDATE_SECRET`,
`RESEND_API_KEY`, and the `S3_*` set for Supabase Storage. Checkout is bank
transfer only, so there are no payment-gateway credentials to set.

The bank account customers pay into is **not** an env var: set it after deploy in
**Admin → Site Settings → Bank transfer details**. Until bank name, account name
and account number are all filled, checkout shows "payment details unavailable"
and refuses to take an order, and the Admin page flags it. The `BANK_TRANSFER_*`
env vars remain as a fallback for pre-Admin deploys.

Use the Supabase **pooler** connection string for `medusa` and `worker` — Railway
redeploys churn connections, and the direct endpoint's connection cap is low.

### 3d. Add the GitHub secrets

| Name                                   | Kind     | Value                                                   |
| -------------------------------------- | -------- | ------------------------------------------------------- |
| `RAILWAY_TOKEN`                        | secret   | Railway **project** token (Project → Settings → Tokens) |
| `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`   | variable | set once prod is seeded                                 |
| `NEXT_PUBLIC_SUPABASE_URL`             | variable | Supabase project URL                                    |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | variable | Supabase publishable key (`sb_publishable_...`)         |

The three `NEXT_PUBLIC_*` entries are repo **variables**, not secrets: they are
baked into the browser bundle at image build time and are public by design.

A _project_ token is scoped to one project and environment, which is what the
workflow needs. An account token would give the CI job access to every project.

### 3e. Protect `main` (so only green code ever deploys)

Settings → Branches → Add rule for `main`: require a PR, and require the `ci`
status check. `deploy` only fires on a successful `ci` run, so this is what keeps
a red build from reaching production.

### 3f. First run

Actions → **deploy** → **Run workflow**. Watch `images` build, then `deploy` roll
each service. The health checks fail the job if either public service does not
return 200 within 300s.

---

## 4. Everyday use

- **Ship:** merge a PR to `main`. That's the entire process.
- **Manual redeploy:** Actions → **deploy** → **Run workflow**.
- **Roll back:** Railway → the service → **Deployments** → pick the last good
  one → **⋯ → Redeploy**. This is instant and needs no git operation. Roll back
  `medusa` first if the bad deploy included a migration.
  Reverting the commit on `main` also works and is the right move when the bad
  change must not come back on the next deploy.

**A caution on rollback and migrations:** Medusa migrations are forward-only.
Redeploying an older image does **not** roll the schema back, so an older build
runs against a newer schema. That is usually fine (additive migrations), but if a
migration dropped or renamed a column, restore the Supabase PITR snapshot instead.

---

## 4b. Content is code (legal/policy pages)

The Pre-Deploy Command runs `seed-content.js` with `SEED_CONTENT_FORCE=1` on
**every deploy**, so **editing text in the repo is all it takes to update the
live site** — no manual seeding.

**Why this exists:** the seed is normally idempotent and _skips_ rows that
already exist. That means an environment keeps whatever copy it was FIRST seeded
with — which is exactly how prod ended up serving one-paragraph legal policies
while the full multi-section versions sat in `seed-content.ts`. The force flag
rewrites existing rows instead.

**The contract — read this before editing content:**

- For the slugs defined in `seed-content.ts` (the 10 legal pages EN+ES, the
  sample article, site settings) the **repo is the source of truth**. Edits made
  to those pages in Admin **will be overwritten on the next deploy**.
- Pages created in Admin that are **not** in that file are never touched.
- So: change legal copy in `seed-content.ts` and open a PR. You get a git audit
  trail of every wording change — useful when counsel reviews (task 40).

To refresh content manually without a deploy:

```bash
railway ssh --service medusa
SEED_CONTENT_FORCE=1 npx medusa exec ./src/scripts/seed-content.js
```

(The image ships the **built** server, so the path is the compiled `.js`, not `.ts`.)

---

## 5. Troubleshooting

| Symptom                          | Cause                                               | Fix                                                                                 |
| -------------------------------- | --------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `deploy` job fails on `redeploy` | `RAILWAY_TOKEN` missing/expired, or service renamed | Re-issue the project token; service names must match `medusa`/`worker`/`storefront` |
| `images` job fails               | Docker build error                                  | Read the job log; it's a real build break — fix and re-push                         |
| Health check step red            | Service didn't come up                              | Railway → the service → **Deploy Logs**                                             |
| Deploy stuck in "Pre-Deploy"     | A migration is waiting on a lock                    | Check Supabase → Database → Roles/locks; a prior deploy may still hold it           |
| `EACCES … .config/medusa`        | `HOME` not set on the service                       | Set `HOME=/tmp` (see §3a)                                                           |
| DB auth/SSL errors               | Wrong `DATABASE_URL` or missing `sslmode`           | Use the Supabase pooler string; `medusa-config.ts` adds SSL for supabase hosts      |
| Deploy green but site stale      | Browser cache                                       | Hard refresh; confirm the deployment timestamp in Railway                           |

---

## 6. Environments

Railway environments are the staging/prod split: duplicate the `production`
environment to `staging`, point it at a separate Supabase project, and issue a
second project token if you want CI to deploy it. Keep `COMING_SOON=true` in
staging so it never indexes.
