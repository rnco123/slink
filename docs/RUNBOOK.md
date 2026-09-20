# Operations Runbook — Saludlink

Incident triage and recovery for the production site — a top-level operator
runbook. Two companion docs are authoritative for their areas and are referenced
here rather than duplicated:

- **Monitoring runbook** — [`infra/monitoring/docs/runbook.md`](../infra/monitoring/docs/runbook.md)
  (task 47, monitoring session): the alert→action index, per-alert plays, and the
  detailed site-down decision tree grounded in the live infra IDs.
- **Deploy mechanics** — [`docs/DEPLOYMENT.md`](./DEPLOYMENT.md): Railway service
  layout, the pre-deploy command, image build/push, rollback.

This doc is the quick, deploy-cross-referenced entry point (triage, rollback,
DB restore, environment rebuild, escalation) for engineers who start in `docs/`.

**Platform:** compute is **Railway** (services `medusa`, `worker`, `storefront`,
`redis`); Postgres is **Supabase**; uploads are **Supabase Storage**; email is
**Resend**. There is no EC2 box, no Caddy and no SSH — TLS, routing and restarts
are Railway's.

**Golden signals:** storefront `https://saludlinkusa.com/api/health` and Medusa
`https://manage.saludlinkusa.com/health` should both return `200`. The
monitoring stack (Grafana / Prometheus / Alertmanager / Loki, task 11) and the
Monitoring API (task 27) are the primary dashboards.

---

## 0. First 60 seconds — triage

1. **Is the site down or degraded?**
   - `curl -sS -o /dev/null -w '%{http_code}\n' https://saludlinkusa.com/api/health`
   - `curl -sS -o /dev/null -w '%{http_code}\n' https://manage.saludlinkusa.com/health`
2. **What changed recently?** Check the last `deploy.yml` run and the last merged
   commit. Most incidents follow a deploy — if so, jump to **§3 Rollback**.
3. **Scope it:** storefront only, admin only, or both?
   - Both down → shared infra: Supabase, DNS, or a Railway platform incident. See §1.
   - Storefront only → storefront service or a bad build. See §2.
   - Admin only → medusa service. See §2.
4. **Declare + communicate** if customer-facing. Note the start time (for the
   post-incident timeline).

---

## 1. Site fully down (both surfaces)

Likely shared infra: Supabase (the DB both surfaces depend on), DNS, or Railway
itself.

| Symptom                              | Check                                                                        | Action                                                                  |
| ------------------------------------ | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Connection refused / timeout on both | [status.railway.com](https://status.railway.com)                             | Platform incident → no action but comms; otherwise continue below.      |
| Services not running                 | Railway → each service → **Deployments**                                     | Redeploy the last good deployment; read **Deploy Logs** for the crash.  |
| TLS / cert errors                    | Railway → service → **Settings → Domains**                                   | Railway manages certs; a stuck domain usually needs re-adding.          |
| DNS not resolving                    | `dig +short saludlinkusa.com`                                                | CNAME must point at the Railway-provided target (operator-managed DNS). |
| DB connection errors in medusa logs  | [status.supabase.com](https://status.supabase.com) + `DATABASE_URL` validity | See **§4 Database**.                                                    |
| `too many connections`               | Supabase → Database → Connection pooling                                     | Ensure services use the **pooler** string, not the direct endpoint.     |

Railway restarts a crash-looping container automatically, so a service that is
still down after a few minutes is failing at boot — read the deploy logs rather
than redeploying repeatedly. Memory limits are per-service in Railway; an OOM
shows in the service's **Metrics** tab and needs a plan/limit bump, not a restart.

---

## 2. One surface down / erroring

1. Railway → the service → **Deployments**: is it `Active`, or crash-looping?
2. Read **Deploy Logs** (build/boot) and **HTTP Logs** (runtime).
3. **Bad image / build:** if it started right after a deploy, **roll back** (§3).
4. **Env/secret issue:** the app fails fast at boot with the offending variable
   named (`env.ts`, task 74). Fix the value in the service's **Variables** tab;
   Railway redeploys the service on a variable change.
5. **Storefront can't reach Medusa:** verify `NEXT_PUBLIC_MEDUSA_BACKEND_URL` and
   CORS (`STORE_CORS`/`AUTH_CORS`) — see [SECURITY-CORS-COOKIES.md](./SECURITY-CORS-COOKIES.md).
   Note the `NEXT_PUBLIC_*` values are baked at **image build** time, so changing
   them in Railway alone is not enough — they must be changed as repo variables
   and the image rebuilt.

---

## 3. Rollback (bad deploy)

Railway keeps every deployment. To roll back:

> Railway → the service → **Deployments** → the last good one → **⋯ → Redeploy**

Roll back `medusa` first if the bad deploy included a migration, then `worker`
and `storefront`. Images are also tagged with the commit SHA as well as `latest`
(see [DEPLOYMENT.md](./DEPLOYMENT.md)), so you can alternatively point a service's
image source at `ghcr.io/rnco123/slink-medusa:<sha>` to pin it.

Reverting the commit on `main` also works and is the right move when the bad
change must not come back on the next deploy.

**Migrations:** a rollback of code does NOT roll back DB migrations. Migrations
follow the expand→migrate→contract rule
([MIGRATIONS.md](./MIGRATIONS.md), enforced fresh by the migration-test CI job,
task 70) precisely so old code keeps working against the new schema — so a code
rollback is safe. Only reverse a migration deliberately (see §4).

---

## 4. Database (Supabase Postgres)

Supabase is managed: automated daily backups plus point-in-time recovery (PITR)
on the paid tiers. **Confirm PITR is actually enabled for this project** — it is
not on by default on every plan, and §4's restore play depends on it.

- **Read-only / connection issues:** check the Supabase status page and the
  project's Database → Connection pooling settings. Prefer the **pooler**
  connection string for `medusa`/`worker`: Railway redeploys churn connections
  and the direct endpoint's cap is low.
- **Restore (PITR):** Supabase → Database → Backups → restore to the chosen
  timestamp. Restoring is **in place** for the project, so take the site into
  maintenance first (scale the services to zero) rather than serving traffic
  against a database that is being rewound. For a side-by-side restore, create a
  new project from the backup and repoint `DATABASE_URL`.
- **Reversing a migration:** only when a migration itself is the fault. Prefer a
  forward-fix migration. A hard down-migration is a last resort and must be paired
  with a matching code rollback (§3).
- **Restore drill:** task 45 (untested until drilled) — schedule a PITR + restore
  rehearsal against a throwaway project so recovery time is known before it's
  needed.

---

## 5. Rebuild the environment (< 1 hour target)

Railway services are stateless: everything durable lives in Supabase (Postgres +
Storage). Redis is cache/queues, not a source of truth, and rebuilds empty.

If a Railway environment is lost or corrupted:

1. Create a new environment (or duplicate `production`) in the Railway project.
2. Recreate the four services from the GHCR images and the Redis template — the
   exact layout and per-service variables are in [DEPLOYMENT.md](./DEPLOYMENT.md) §3a.
3. Set the `medusa` **Pre-Deploy Command** (DEPLOYMENT.md §3b) and the variables
   (§3c). `DATABASE_URL` still points at the surviving Supabase project, so no
   data restore is involved.
4. Attach the domains; Railway issues TLS.
5. Verify both health endpoints (§0).

Because Supabase persists independently, RTO is dominated by service creation +
image pull, which fits the < 1h target.

---

## 6. Escalation & data

- **Suspected PHI/security incident:** this store does not hold PHI by design
  (see [privacy-boundary.md](./privacy-boundary.md)); clinical data lives with the
  licensed telehealth provider. Still, treat any suspected breach per the (human-
  owned) breach procedure — engage the responsible owner, preserve logs (Loki),
  do not delete evidence.
- **Secrets exposure:** rotate the affected value at its source (Supabase, Stripe,
  Resend), update the Railway service variable, and let the redeploy roll it.
  Secrets-rotation procedure is task 53.
- **Audit trail:** admin mutations are recorded by the append-only audit-log
  module — a source of truth for "who changed what, when".

---

## Quick reference

| Thing            | Where                                                                          |
| ---------------- | ------------------------------------------------------------------------------ |
| Health (store)   | `https://saludlinkusa.com/api/health`                                          |
| Health (admin)   | `https://manage.saludlinkusa.com/health`                                       |
| Dashboards       | Grafana / Prometheus / Alertmanager / Loki (task 11); Monitoring API (task 27) |
| Deploy mechanics | [`DEPLOYMENT.md`](./DEPLOYMENT.md)                                             |
| Migrations rule  | [`MIGRATIONS.md`](./MIGRATIONS.md)                                             |
| Env contract     | [`ENVIRONMENT.md`](./ENVIRONMENT.md)                                           |
| CORS / cookies   | [`SECURITY-CORS-COOKIES.md`](./SECURITY-CORS-COOKIES.md)                       |
| Compute          | Railway project → services `medusa` · `worker` · `storefront` · `redis`        |
| Database         | Supabase project (Postgres + Storage)                                          |
| Secrets          | Railway service **Variables** (per environment)                                |
