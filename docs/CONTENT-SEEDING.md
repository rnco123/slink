# Content prod-seeding strategy (dev → prod)

How the Saludlink mini-CMS content (legal/policy pages, sample article, site
settings) gets from a dev database into production, and how it stays in sync
(roadmap task 63).

The content lives in the custom **content module** (Medusa-native CMS), not in
code, so a fresh prod database starts empty of content even after migrations run.
This doc defines how we populate it.

## What counts as "content"

Seeded by [`apps/medusa/src/scripts/seed-content.ts`](../apps/medusa/src/scripts/seed-content.ts):

- **10 legal/policy pages**, each in EN + ES (privacy policy, terms, telehealth
  consent, medical disclaimer, accessibility, etc.).
- **A sample health article** (EN + ES).
- **Site settings**: contact info, telemedicine link, state availability.

Catalog (products, categories, regions) is a separate concern —
[`seed.ts`](../apps/medusa/src/scripts/seed.ts) — and is **not** idempotent (it
will create duplicates on a second run). Content seeding _is_ idempotent (below),
so the two are handled differently.

## Chosen strategy: idempotent seed script (run against prod)

**We run `seed-content.ts` directly against the production database**, not a
SQL dump/restore of the dev content tables.

Why script-over-dump:

- `seed-content.ts` is **idempotent** — it skips any row that already exists for a
  `(slug, locale)` pair or an existing setting key. Re-running it is safe and is
  how content updates ship: add/edit entries in the script, re-run, only the
  new/changed rows land.
- It's **reviewable in git** — the legal copy is source-controlled, diffable, and
  carries the "Draft for review — pending counsel" notice (task 40 stays open;
  these are not final terms until counsel signs off).
- It avoids coupling prod to a developer's local DB state (a dump would carry
  whatever ad-hoc rows that machine happened to have).

### Running it in prod

The migration one-shot has already created the content module's tables (verified
fresh by the migration-test CI job, task 70). Then, on the box (or any host with
the prod `DATABASE_URL`):

```sh
# Inside the medusa container / with the prod env loaded:
npx medusa exec ./src/scripts/seed-content.ts
```

- Order: **migrate → seed-content → (verify pages render)**. Content seeding must
  run after migrations and can run before or after catalog seeding.
- Safe to re-run any time — idempotent. This is the update path, not just the
  initial path.
- PHI note: content is public marketing/legal copy — no customer data, no PHI. It
  is safe to keep in git and to seed identically across environments.

### Updating content later

1. Edit the entries in `seed-content.ts` (or add new `(slug, locale)` rows).
2. Ship the change through CI (the change is code).
3. Re-run `npx medusa exec ./src/scripts/seed-content.ts` against prod.
4. If a page's cached render is stale, trigger revalidation (the storefront
   revalidation webhook, task 34) or redeploy the storefront.

> **Note on edits made in the admin UI:** the content module is also editable
> through the Medusa admin. If editors change copy directly in prod admin, those
> edits are NOT reflected back into `seed-content.ts`, and the script's
> "skip existing" idempotency means a re-run will NOT overwrite them. Decide one
> source of truth per page: either manage it in the script (re-seedable) or in the
> admin (operator-owned). For launch, the legal pages are script-owned (counsel
> review flows through git); operational copy can move to admin-owned post-launch.

## Verifying after seed

- `GET /store/content/pages` (Medusa) lists seeded pages.
- Storefront: `/en/legal/privacy-policy` and `/es/legal/privacy-policy` (and the
  other 9 slugs) should render 200 with content.
- The sitemap emits the legal pages (task 22) — `sitemap.xml` should include them.
