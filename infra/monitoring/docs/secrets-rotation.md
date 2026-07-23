# Saludlink — Secrets Rotation Procedure (task 53)

How every secret in the system is rotated: where it lives, the exact steps, the
blast radius, and a routine cadence. Rotation is also the **incident response**
when a secret may have leaked — see the runbook's §7.

> Owner: Session 3 (monitoring). Related:
> [runbook.md](runbook.md), [ENVIRONMENT.md](../../../docs/ENVIRONMENT.md),
> exporter role [`config/postgres/exporter-role.sql`](../config/postgres/exporter-role.sql).

## Principles

- **Source of truth = SSM Parameter Store** (`/slink/prod/*`, SecureString,
  us-east-1). The box's `.env` is *derived* from SSM via
  [`infra/deploy/build-env.sh`](../../deploy/build-env.sh) — never hand-edit
  `.env` as the canonical copy; change SSM then rebuild.
- **Rotate forward, verify, then retire.** For anything with a live dependency
  (DB, sessions) prefer overlap: add the new secret, cut over, remove the old.
- **Never commit a secret.** Local secret-bearing files are git-ignored
  (`infra/monitoring/.env`, `services/monitoring/.env`, `.env*`). Gitleaks
  (pre-commit + CI) is the backstop.
- **After rotating, confirm the old value is dead** (auth fails with it).

## Blast-radius & cadence at a glance

| Secret | Store | Rotating it disrupts | Cadence | Steps |
| ------ | ----- | -------------------- | ------- | ----- |
| `JWT_SECRET` | SSM `/slink/prod/jwt` | **Logs out all admin/customer sessions** | 90d / on suspicion | §1 |
| `COOKIE_SECRET` | SSM `/slink/prod/cookie` | Invalidates signed cookies (re-login) | 90d / on suspicion | §1 |
| `REVALIDATE_SECRET` | SSM `/slink/prod/revalidate` | ISR revalidation webhook until both sides updated | 90d | §1 |
| App DB password | SSM `/slink/prod/db_password` (+ `database_url`) | Brief app DB reconnect | 90d / on suspicion | §2 |
| `slink_exporter` DB password | SSM (new: `/slink/prod/pg_exporter_password`) | postgres-exporter metrics gap (seconds) | 90d | §3 |
| Grafana admin password | SSM (`/slink/prod/grafana_admin_password`) | Grafana UI login | 180d | §4 |
| Bull Board password | SSM (`/slink/prod/bull_board_password`) | Bull Board UI login | 180d | §4 |
| Monitoring API token | SSM (`/slink/prod/monitoring_api_token`) | Admin panel → Monitoring API calls | 180d | §4 |
| Medusa **publishable** key | Medusa admin + storefront env | Storefront → Medusa store API | on compromise | §5 |
| PostHog personal API key | SSM (when analytics armed) | `/monitoring/analytics` reads | 180d | §6 |
| Stripe keys | SSM (when task 20 lands) | Payments | per Stripe policy | §6 |
| SES SMTP creds | SSM (when task 34/62 lands) | Order emails | 180d | §6 |
| GitHub PAT | local `completion.md` cred block | CI/repo push | **after roadmap complete** (task 16) | §7 |
| SSH key `slink-key` | `~/.ssh/slink-key.pem` + EC2 key pair | SSH access to the box | on staff change/compromise | §8 |

---

## 0. The rotation mechanics (applies to every SSM secret)

```powershell
# PowerShell, on your laptop
$env:AWS_PROFILE = 'slink'   # account 537124932549, us-east-1

# 1. Write the new value (SecureString).
aws ssm put-parameter --name /slink/prod/<name> --type SecureString `
  --value '<new-secret>' --overwrite

# 2. On the box, rebuild .env from SSM and restart the affected services.
ssh -i ~/.ssh/slink-key.pem ubuntu@23.21.167.196
cd ~/slink && ./build-env.sh && docker compose -f docker-compose.prod.yml up -d <services>
```

Generate strong values with `openssl rand -base64 48` (secrets) /
`openssl rand -hex 32` (tokens). Never reuse a value across environments.

---

## 1. App secrets — JWT / COOKIE / REVALIDATE

These are Medusa/Next signing secrets.

1. Put the new value(s) in SSM (`/slink/prod/{jwt,cookie,revalidate}`).
2. Rebuild `.env`, then restart the apps: `up -d medusa worker storefront`.
3. **Expected impact:** rotating `jwt`/`cookie` **logs everyone out** — do it in
   a low-traffic window and post a heads-up. `revalidate` must match on both the
   Medusa emitter and the storefront receiver, so update together.
4. Verify: admin login works with a fresh session; old tokens are rejected.

## 2. Application database password

Overlap isn't available on a single master user, so do it fast:

1. Change the RDS master password (or the app role's password):
   ```powershell
   aws rds modify-db-instance --db-instance-identifier slink-db `
     --master-user-password '<new>' --apply-immediately
   ```
2. Update **both** `/slink/prod/db_password` and the full
   `/slink/prod/database_url` (it embeds the password).
3. Rebuild `.env`, `up -d medusa worker medusa-migrate`. Brief reconnect only.
4. Verify: `/monitoring/health` DB component green; app serves orders.

## 3. Postgres exporter role (`slink_exporter`) — task 28

The read-only monitoring role. Rotating it never touches app data.

1. Re-run the idempotent SQL with a new password (it `ALTER`s the existing role):
   ```bash
   psql -h slink-db.cw10w44cq99y.us-east-1.rds.amazonaws.com -U <admin> -d postgres \
     -v exporter_password='<new>' -f config/postgres/exporter-role.sql
   ```
2. Store it: `aws ssm put-parameter --name /slink/prod/pg_exporter_password --type SecureString --value '<new>' --overwrite`,
   and update `PG_EXPORTER_DSN` (it embeds the password) in the monitoring `.env`.
3. Restart just the exporter: `docker compose ... up -d postgres-exporter`.
4. Verify: `pg_up == 1` again in Prometheus within one scrape (~15s).

## 4. Admin-UI passwords + Monitoring API token

Grafana / Bull Board / Monitoring API token are all self-contained:

1. New value → SSM (`grafana_admin_password` / `bull_board_password` /
   `monitoring_api_token`).
2. Rebuild the monitoring `.env`, restart the one service
   (`grafana` / `bull-board` / the monitoring-api container).
   - Grafana: the admin password env only applies on first boot; to change an
     existing install use `grafana-cli admin reset-admin-password '<new>'` inside
     the container, then update SSM to match.
3. For the Monitoring API token: also update the value the **admin panel** injects
   server-side, or the panel's calls 401.

## 5. Medusa publishable key

The storefront uses a **publishable** key (not a secret admin key) for the store
API. If it leaks it's low-severity, but rotate by creating a new publishable key
in Medusa admin (Settings → Publishable API keys), updating
`NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` in the storefront env/SSM, rebuilding the
storefront image/env, then revoking the old key.

## 6. Third-party SaaS keys (PostHog / Stripe / SES)

Gated until those integrations are armed. When live:

- **PostHog personal API key:** rotate in PostHog → project settings; update SSM;
  restart the monitoring-api. Public project key is not a secret.
- **Stripe:** roll in the Stripe dashboard (supports overlap); update SSM
  secret + webhook signing secret together; restart `medusa worker`.
- **SES SMTP:** regenerate SMTP credentials in AWS SES/IAM; update SSM; restart
  the sender. Re-verify SPF/DKIM unaffected (they're DNS, not the creds).

## 7. GitHub PAT

The build-time PAT lives in the local `completion.md` credential block (git-ignored)
and is scheduled to be **rotated after the whole roadmap is complete** (task 16).
To rotate: create a new fine-grained PAT (repo scope), update the local git remote
credential + any CI secret, then **delete the old PAT** in GitHub settings. If it
ever landed in git history, a history scrub is also required (task 16 note).

## 8. SSH key `slink-key`

1. Create a new key pair:
   `aws ec2 create-key-pair --key-name slink-key-2 --query 'KeyMaterial' --output text > ~/.ssh/slink-key-2.pem` (chmod 600).
2. Add its public key to the box's `~/.ssh/authorized_keys` (while still logged in
   on the old key).
3. Verify you can log in with the new key, then remove the old public key from
   `authorized_keys` and delete the old EC2 key pair.
4. Update the runbook's SSH command + anywhere the key name is referenced.

---

## Verification checklist (after ANY rotation)

- [ ] New value in SSM (`aws ssm get-parameter --name … --with-decryption` shows it).
- [ ] `.env` on the box rebuilt from SSM (not hand-edited).
- [ ] Affected service restarted and **healthy** (`/monitoring/health`).
- [ ] Old value now **fails** (auth rejected / connection refused).
- [ ] No secret written to logs, git, or an artifact (Gitleaks clean).
- [ ] Rotation noted with date; next-due date updated per the cadence table.
