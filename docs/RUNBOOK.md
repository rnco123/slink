# Operations Runbook — Saludlink

Incident triage and recovery for the production site — a top-level operator
runbook. Two companion docs are authoritative for their areas and are referenced
here rather than duplicated:

- **Monitoring runbook** — [`infra/monitoring/docs/runbook.md`](../infra/monitoring/docs/runbook.md)
  (task 47, monitoring session): the alert→action index, per-alert plays, and the
  detailed site-down decision tree grounded in the live infra IDs.
- **Deploy mechanics** — [`infra/deploy/README.md`](../infra/deploy/README.md):
  provisioning, image build/push, first bring-up, TLS.

This doc is the quick, deploy-cross-referenced entry point (triage, rollback,
DB restore, re-provision, escalation) for engineers who start in `docs/`.

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
   - Both down → box / Caddy / DNS / RDS (shared infra). See §1.
   - Storefront only → storefront container or a bad build. See §2.
   - Admin only → medusa server container. See §2.
4. **Declare + communicate** if customer-facing. Note the start time (for the
   post-incident timeline).

---

## 1. Site fully down (both surfaces)

Likely shared infra: the EC2 box, Caddy (TLS/routing), DNS, or RDS.

| Symptom                              | Check                                                              | Action                                                            |
| ------------------------------------ | ------------------------------------------------------------------ | ----------------------------------------------------------------- |
| Connection refused / timeout on both | Can you SSH to the box? `ssh -i ~/.ssh/slink-key.pem ubuntu@<EIP>` | If SSH fails → box/network. See **§5 re-provision**.              |
| SSH works, containers down           | `cd /opt/slink && docker compose ps`                               | `docker compose up -d`; inspect `docker compose logs --tail=200`. |
| TLS / cert errors                    | `docker compose logs caddy --tail=100`                             | Caddy auto-renews; if rate-limited, wait or check the ACME error. |
| DNS not resolving                    | `dig +short saludlinkusa.com`                                      | A-records must point at the Elastic IP (operator-managed DNS).    |
| DB connection errors in medusa logs  | RDS status in the AWS console; SG `slink-db` allows web SG only    | See **§4 Database**.                                              |

The box has a 2GB swap and is a `t3.small` — under memory pressure containers can
be OOM-killed. `docker compose ps` + `dmesg | tail` reveals an OOM. Restart the
affected service; if recurring, it's a capacity issue (scale the instance).

---

## 2. One surface down / erroring

1. `docker compose ps` — is the container `Up` or crash-looping?
2. `docker compose logs <storefront|medusa> --tail=200`.
3. **Bad image / build:** if it started right after a deploy, **roll back** (§3).
4. **Env/secret issue:** the app fails fast at boot with the offending variable
   named (`env.ts`, task 74). Fix the value in SSM `/slink/prod/*`, rebuild
   `.env.prod` (`infra/deploy/build-env.sh`), re-copy, `docker compose up -d`.
5. **Storefront can't reach Medusa:** verify `NEXT_PUBLIC_MEDUSA_BACKEND_URL` and
   CORS (`STORE_CORS`/`AUTH_CORS`) — see [SECURITY-CORS-COOKIES.md](./SECURITY-CORS-COOKIES.md).

---

## 3. Rollback (bad deploy)

Images are tagged with the commit SHA as well as `latest` (see
`infra/deploy/README.md` → Images). To roll back to a known-good SHA:

```sh
ssh -i ~/.ssh/slink-key.pem ubuntu@<EIP>
cd /opt/slink
# Pin the previous good SHA for both services, then recreate:
export IMAGE_TAG=<previous-good-sha>   # if compose is parameterized by tag
docker compose pull && docker compose up -d
```

If the compose file pins `latest`, temporarily edit the image tags to the good
SHA on the box and `up -d`. **Migrations:** a rollback of code does NOT roll back
DB migrations. Migrations follow the expand→migrate→contract rule
([MIGRATIONS.md](./MIGRATIONS.md), enforced fresh by the migration-test CI job,
task 70) precisely so old code keeps working against the new schema — so a code
rollback is safe. Only reverse a migration deliberately (see §4).

> Deploy rollback tooling (per-commit tags, keep-last-5, one-command rollback) is
> roadmap task 44, owned by the deploy session. Until it lands, roll back
> manually as above.

---

## 4. Database (RDS Postgres)

RDS `slink-db` is managed: automated daily backups + point-in-time recovery
(PITR), 7-day retention.

- **Read-only / connection issues:** check RDS status + the `slink-db` security
  group (5432 from the web SG only). Never open 5432 publicly.
- **Restore (PITR):** in the AWS console, restore `slink-db` to a new instance at
  the chosen timestamp, then repoint `DATABASE_URL` (SSM `/slink/prod/database_url`)
  at the restored endpoint, rebuild `.env.prod`, and `up -d`. RDS restores to a
  **new** instance — you cut over by DNS/endpoint, you don't overwrite in place.
- **Reversing a migration:** only when a migration itself is the fault. Prefer a
  forward-fix migration. A hard down-migration is a last resort and must be paired
  with a matching code rollback (§3).
- **Restore drill:** task 45 (untested until drilled) — schedule a PITR + restore
  rehearsal against a throwaway instance so recovery time is known before it's
  needed.

---

## 5. Re-provision the box (< 1 hour target)

If the EC2 box is lost/corrupted, the stack is stateless except RDS (managed) and
the media bucket (S3) — both survive the box. Recovery = stand up a new box and
bring the stack up:

1. Provision a replacement EC2 (same type/AMI/SG/key) + associate the **existing**
   Elastic IP — see `infra/deploy/README.md` for the exact resource IDs. The EIP
   keeps DNS valid, so no DNS wait.
2. Install Docker (+ swap) via the documented user-data.
3. `infra/deploy/build-env.sh` → `.env.prod`, `scp` the stack (`docker-compose.prod.yml`,
   `Caddyfile`, `.env.prod`) to `/opt/slink/`.
4. `docker compose pull && docker compose up -d`. Caddy re-issues TLS.
5. Verify both health endpoints (§0). Redis is in-container and rebuilds empty
   (it's cache/queues, not the source of truth) — no restore needed.

Because RDS and S3 persist independently, RTO is dominated by EC2 provision +
image pull, which fits the < 1h target. Full provisioning steps belong to the
deploy session's docs.

---

## 6. Escalation & data

- **Suspected PHI/security incident:** this store does not hold PHI by design
  (see [privacy-boundary.md](./privacy-boundary.md)); clinical data lives with the
  licensed telehealth provider. Still, treat any suspected breach per the (human-
  owned) breach procedure — engage the responsible owner, preserve logs (Loki),
  do not delete evidence.
- **Secrets exposure:** rotate the affected value in SSM `/slink/prod/*`, rebuild
  `.env.prod`, redeploy. Secrets-rotation procedure is task 53.
- **Audit trail:** admin mutations are recorded by the append-only audit-log
  module — a source of truth for "who changed what, when".

---

## Quick reference

| Thing            | Where                                                                          |
| ---------------- | ------------------------------------------------------------------------------ |
| Health (store)   | `https://saludlinkusa.com/api/health`                                          |
| Health (admin)   | `https://manage.saludlinkusa.com/health`                                       |
| Dashboards       | Grafana / Prometheus / Alertmanager / Loki (task 11); Monitoring API (task 27) |
| Deploy mechanics | [`infra/deploy/README.md`](../infra/deploy/README.md)                          |
| Migrations rule  | [`MIGRATIONS.md`](./MIGRATIONS.md)                                             |
| Env contract     | [`ENVIRONMENT.md`](./ENVIRONMENT.md)                                           |
| CORS / cookies   | [`SECURITY-CORS-COOKIES.md`](./SECURITY-CORS-COOKIES.md)                       |
| Secrets          | AWS SSM Parameter Store `/slink/prod/*`                                        |
