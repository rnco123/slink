# Saludlink — Operations Runbook (task 47)

**Audience:** whoever is on the keyboard when something breaks. Optimised for
_copy-paste under pressure_. Every command names the real resource. When a step
says "verify", actually run the check before moving on.

> Owner: Session 3 (monitoring). Companion docs:
> [ENVIRONMENT.md](../../../docs/ENVIRONMENT.md),
> [MIGRATIONS.md](../../../docs/MIGRATIONS.md),
> [secrets-rotation.md](secrets-rotation.md),
> deploy pipeline [`docs/DEPLOYMENT.md`](../../../docs/DEPLOYMENT.md).
> Alert definitions: [`config/prometheus/alerts/rules.yml`](../config/prometheus/alerts/rules.yml).

---

## 0. At a glance

| Thing             | Value                                                                                                 |
| ----------------- | ----------------------------------------------------------------------------------------------------- |
| Public storefront | `https://saludlinkusa.com` (+ `www.`)                                                                 |
| Admin             | `https://manage.saludlinkusa.com` (Medusa login is the gate)                                          |
| Compute           | **Railway** project → services `medusa` · `worker` · `storefront` · `redis`                           |
| Database          | **Supabase** Postgres 16 (pooler for apps; PITR per plan — see §5)                                    |
| Object storage    | **Supabase Storage** (S3 protocol) — product/content uploads                                          |
| Email             | **Resend**                                                                                            |
| Images            | GHCR `ghcr.io/rnco123/slink-medusa` · `…/slink-storefront`                                            |
| Secrets           | Railway service **Variables**, per environment                                                        |
| Access            | Railway dashboard, or `railway` CLI (`railway login`)                                                 |
| Status pages      | [status.railway.com](https://status.railway.com) · [status.supabase.com](https://status.supabase.com) |

**Health endpoints** (the truth about "is it up"):

- Storefront: `https://saludlinkusa.com/api/health` → `{"status":"ok",...}`
- Medusa: `https://manage.saludlinkusa.com/health` → `OK`
- Monitoring API: internal `:3009/healthz`

**Where you'll see it first:** Alertmanager (`:9093`) / Grafana (`:3001`) /
Uptime Kuma (`:3002`).

> ⚠ **Open decision — where the monitoring stack itself runs.** The Prometheus /
> Grafana / Loki / Alertmanager / Uptime Kuma compose stack in `infra/monitoring/`
> was previously co-located on the application box. With the move to Railway there
> is no such box, and **its hosting has not been decided**: the options are a
> Railway service group of its own, a separate small VM, or a managed vendor
> (Grafana Cloud). Until that is settled, the `:9093` / `:3001` / `:3002`
> addresses in this doc are wherever you are currently running the stack. The
> triage steps below for the _application_ are correct regardless.

There is no shared cloud account to be careful in any more, and no
`Project=slink` tagging rule: the Railway project and the Supabase project
contain only this system.

---

## 1. First 5 minutes (any incident)

1. **Confirm scope.** Is it the storefront, the admin, or both? Hit both health
   URLs above from your laptop.
2. **Check the alert.** Open Alertmanager → what's firing? Match it in §2.
3. **Check the platforms.** [Railway status](https://status.railway.com) and
   [Supabase status](https://status.supabase.com). A platform incident changes
   your job from "fix" to "communicate".
4. **Snapshot state before changing anything.** Railway → each service →
   **Deployments** (is it Active? when did it last deploy?) and **Deploy Logs**.
   To keep a copy:
   ```bash
   railway logs --service medusa > /tmp/incident-$(date +%s).log
   ```
5. **Communicate.** Note start time + symptom. You'll need it for §7.

---

## 2. Alert → action index

Each alert in [`rules.yml`](../config/prometheus/alerts/rules.yml) maps to a play:

| Alert (severity)             | Means                                | Go to       |
| ---------------------------- | ------------------------------------ | ----------- |
| `SiteProbeFailing` (crit)    | Public URL not returning 2xx         | §3          |
| `TargetDown` (crit)          | A scrape target is unreachable       | §3.3 / §3.5 |
| `PostgresDown` (crit)        | `pg_up==0`, DB unreachable           | §3.5        |
| `RedisDown` (crit)           | `redis_up==0`, event bus/queues down | §3.6        |
| `HostLowDisk` (crit)         | <10% disk on the monitoring host     | §3.7        |
| `SiteSlowResponse` (warn)    | processing >2s                       | §3.4        |
| `TLSCertExpiringSoon` (warn) | cert <14 days                        | §3.4        |
| `HostHighCpu/Memory` (warn)  | saturation                           | §3.7        |
| `PostgresTooManyConnections` | pool >85% of max                     | §3.5        |
| `RedisHighMemory` (warn)     | Redis near maxmemory                 | §3.6        |

---

## 3. Site-down triage (decision tree)

Work top-down; each rung eliminates a layer.

### 3.1 DNS (is the address even right?)

```bash
dig +short saludlinkusa.com
dig +short manage.saludlinkusa.com
```

Both must resolve to the CNAME target Railway shows under the service's
**Settings → Domains**. If a record is missing or points somewhere stale, fix it
at the DNS provider — that is operator-managed and outside Railway.

Railway's generated `*.up.railway.app` domain bypasses your DNS entirely, so
hitting it is the fastest way to tell a DNS problem from an app problem:

```bash
curl -sS -o /dev/null -w '%{http_code}\n' https://<service>.up.railway.app/api/health
```

Railway domain healthy + custom domain failing → it's DNS/TLS (§3.4).

### 3.2 Is the service running?

Railway → the project → the environment → the service → **Deployments**.

- **Active** → the app is up as far as the platform knows; go to §3.3.
- **Crashed / restarting** → read **Deploy Logs**; the app is failing at boot.
  Env/secret problems fail fast and name the variable (`env.ts`, task 74).
- **Building / Deploying** stuck → check the `deploy` workflow run in GitHub;
  the image may never have been pushed.
- **Removed / no deployments** → §6.

### 3.3 Are the app containers healthy?

```bash
railway status
railway logs --service medusa --tail 200
railway logs --service storefront --tail 200
```

- Crash-looping → the logs name the cause. Railway restarts automatically, so a
  service still down after a few minutes is failing at boot, not flapping.
- Healthy logs but 5xx at the edge → §3.4.
- To get a shell inside a running service: `railway ssh --service medusa`.

### 3.4 Edge / TLS

Railway terminates TLS and routes by domain; there is no Caddy to inspect.
Symptoms: cert errors, 502s.

- **502 / 503** → the service is down or not listening on the injected `$PORT` →
  §3.2 / §3.3.
- **Cert error or `TLSCertExpiringSoon`** → Railway → service → **Settings →
  Domains**. A domain stuck "issuing" usually resolves by removing and re-adding
  it, which restarts the ACME flow. The DNS record must be live for the challenge
  to solve, so fix §3.1 first.
- **Slow responses** → check the service's **Metrics** tab for CPU/memory
  saturation, and §3.5 for DB latency.

### 3.5 Postgres (Supabase)

```bash
# From a machine with the app DB URL (or use the Supabase SQL editor):
psql "$DATABASE_URL" -c 'select 1'
```

- Check [status.supabase.com](https://status.supabase.com) first.
- Supabase project **paused** (free tier pauses on inactivity) → resume it in the
  dashboard. This is a common cause of a total outage in non-prod environments.
- `PostgresTooManyConnections` → the apps must use the **pooler** connection
  string, not the direct endpoint. Railway redeploys churn connections and the
  direct endpoint's cap is low. Check Supabase → Database → Connection pooling.
- Auth failures (`28000`) → the password in `DATABASE_URL` is wrong or contains
  URL-reserved characters that were not encoded (see secrets-rotation §2).
- Data problem / bad migration → **§5**.

### 3.6 Redis (queues / event bus)

Redis is a Railway service on the project's private network.

```bash
railway logs --service redis --tail 50
railway ssh --service redis -- redis-cli ping    # expect PONG
```

- Redis down → redeploy the service from Railway. Medusa's event bus + BullMQ
  workflow engine depend on it; the `worker` recovers once Redis is back.
- `RedisHighMemory` → check `redis-cli info memory`; queues may be backed up
  (see Bull Board `:3003` / `/monitoring/queues`).
- `REDIS_URL` on `medusa`/`worker` should reference the Redis service
  (`${{Redis.REDIS_URL}}`) so it survives a Redis redeploy.

### 3.7 Resource saturation

Railway → the service → **Metrics** (CPU, memory, network). There is no shared
host to run out of disk, and no swap to fall back on: a service that exceeds its
memory limit is killed and restarted.

- Sustained CPU/memory pressure → raise the service's limits, or scale it
  (Settings → Resources). This is a plan/config change, not a restart.
- `HostLowDisk` / `HostHighCpu` now refer to **whatever host runs the monitoring
  stack**, not the app — see the open decision in §0.

---

## 4. Rollback (bad deploy)

Railway keeps every deployment, so rollback is a UI action, not an image pin:

> Railway → the service → **Deployments** → the last good one → **⋯ → Redeploy**

Roll `medusa` back first if the bad release included a migration, then `worker`
and `storefront`.

Images are also tagged with the commit SHA as well as `latest`, so you can pin a
service's image source to `ghcr.io/rnco123/slink-medusa:<good-sha>` instead if
you want the rollback to survive the next `railway redeploy`.

> ⚠ **Migrations:** if the bad release ran a forward DB migration (they run in the
> `medusa` service's Pre-Deploy Command), a code rollback alone may mismatch the
> schema. This is why migrations MUST be expand→contract
> ([MIGRATIONS.md](../../../docs/MIGRATIONS.md)): the previous image keeps working
> against the new schema. If a _destructive_ migration shipped, you need §5
> (restore) — do not roll code back over a dropped column.

**Verify recovery (after any fix):**

```bash
curl -s https://saludlinkusa.com/api/health         # {"status":"ok"}
curl -s https://manage.saludlinkusa.com/health      # OK
# and watch SiteProbeFailing clear in Alertmanager
```

---

## 5. Database restore (Supabase)

Supabase takes automated daily backups; **point-in-time recovery is plan-gated**.
Confirm which you have under Supabase → Database → Backups **before** you need
it — the play below assumes PITR.

1. **Stop writes first.** A restore against a live, writing application produces
   an inconsistent result. In Railway, scale `medusa` and `worker` to zero
   replicas (Settings → Resources) or stop the services.
2. **Restore.** Supabase → Database → Backups → choose the timestamp (PITR) or a
   daily backup → restore. This is **in place** for the project.
   - For a side-by-side restore instead, create a new project from the backup and
     repoint `DATABASE_URL` on `medusa`/`worker` at it. Prefer this when you need
     to inspect the old data before committing to a cutover.
3. **Bring the app back.** Restore the replica counts. The Pre-Deploy Command
   re-runs migrations on the next deploy; against a restored older schema that is
   the correct forward direction.
4. **Verify:** both health endpoints, an order lookup in Admin, and
   `/monitoring/health` DB component green.

> **Gap (task 45):** the restore drill is still open. Until it has been rehearsed
> against a throwaway project, the recovery time above is an estimate, not a
> measurement.

---

## 6. Rebuild the environment from scratch (<1 hour, worst case)

Railway services are **cattle**: everything durable lives in Supabase (Postgres +
Storage), so a lost Railway environment costs compute, not data.

1. **Recreate the services.** Duplicate the `production` environment, or create
   the four services fresh from the GHCR images + the Redis template. The exact
   layout is in [DEPLOYMENT.md](../../../docs/DEPLOYMENT.md) §3a.
2. **Set the Pre-Deploy Command** on `medusa` (DEPLOYMENT.md §3b) — this is what
   applies migrations and syncs content/catalog/artwork.
3. **Set the variables** (DEPLOYMENT.md §3c). `DATABASE_URL` still points at the
   surviving Supabase project, so there is no data restore step.
4. **Attach the domains** and wait for TLS to issue; update DNS if the CNAME
   target changed.
5. **Verify** both health endpoints (§0) and that the `deploy` workflow can reach
   the new services (service names must still be `medusa`/`worker`/`storefront`,
   or the workflow's `--service` flags need updating).

---

## 7. After the incident

- Silence resolved alerts in Alertmanager only after confirming green.
- Write a short timeline: detection → cause → fix → verification (use the
  `/tmp/incident-*.log` you captured in §1).
- File follow-ups against the gaps this incident exposed (link the task numbers).
- If a secret was exposed during triage → [secrets-rotation.md](secrets-rotation.md).
- Update this runbook if a step was wrong or missing. A runbook is only as good
  as its last real use.
