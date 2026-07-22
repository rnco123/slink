# Database Migrations — Zero-Downtime Rule

_Roadmap task 49. Applies to every Medusa module migration
(`apps/medusa/src/modules/**/migrations`) and any raw SQL._

Production deploys are **rolling**: the migration one-shot runs, then new app
containers start while old ones may still be serving for a few seconds. A
migration must therefore be safe against **both** the old and the new code
running at the same time. The governing rule:

> **Every migration must be backward-compatible with the code from one release
> ago.** Never ship a schema change and the code that depends on it as a single
> irreversible step.

## The expand → migrate → contract pattern

Split any breaking change across **two** deploys:

1. **Expand (release N).** Add the new shape _additively_ — new nullable column,
   new table, new index (created concurrently). Old code ignores it; new code
   may write to it but must not require it yet. Backfill existing rows.
2. **Migrate (release N).** New code reads/writes the new shape while still
   tolerating the old one.
3. **Contract (release N+1, only after N is fully rolled out).** Drop the old
   column/table/constraint once nothing reads it.

## Do

- **Additive first:** add columns as `nullable` (or with a default) so in-flight
  old code keeps inserting successfully.
- **Backfill in batches** in a separate step/job, not inside the DDL migration.
- **Create indexes `CONCURRENTLY`** on large tables to avoid write locks.
- Make each migration **idempotent** where practical (`IF NOT EXISTS`).
- Keep a **`down`** for every `up`; test the rollback locally.

## Don't (in a single release)

- Rename or drop a column/table that current production code still references.
- Add a `NOT NULL` column **without a default** to a populated table.
- Narrow a type, add a `CHECK`/`FK` constraint, or shrink a `varchar` before all
  rows are known to comply.
- Mix a long backfill into the DDL migration (holds locks, blocks the deploy).

## Workflow

```sh
# generate a migration after changing a module's data models
cd apps/medusa
npx medusa db:generate <ModuleName>

# apply locally
npx medusa db:migrate

# fresh-DB test (CI does this too, task 70): empty Postgres → migrate from zero
```

CI runs a **fresh-DB migration test** (task 70): an empty Postgres is migrated
from zero on every push, so a migration that only works against an already-seeded
database is caught before deploy. Production migrations run as a **compose
one-shot** before the app containers roll (see `docs/RUNBOOK.md`).

## Review checklist (paste into the PR)

- [ ] Additive only, or explicitly the **contract** step of a prior expand.
- [ ] Safe for the previous release's code (old + new run concurrently).
- [ ] New columns nullable / defaulted; no unguarded `NOT NULL`.
- [ ] Indexes on large tables use `CONCURRENTLY`.
- [ ] Reversible `down` written and tested.
- [ ] Backfill (if any) is a separate, batched step.
