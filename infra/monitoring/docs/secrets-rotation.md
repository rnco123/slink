# Saludlink — Secrets Rotation Procedure (task 53)

How every secret in the system is rotated: where it lives, the exact steps, the
blast radius, and a routine cadence. Rotation is also the **incident response**
when a secret may have leaked — see the runbook's §7.

> Owner: Session 3 (monitoring). Related:
> [runbook.md](runbook.md), [ENVIRONMENT.md](../../../docs/ENVIRONMENT.md),
> [DEPLOYMENT.md](../../../docs/DEPLOYMENT.md),
> exporter role [`config/postgres/exporter-role.sql`](../config/postgres/exporter-role.sql).

## Principles

- **Source of truth = Railway service variables**, per project + environment.
  There is no derived `.env` file to rebuild and no box to copy it to: editing a
  variable in Railway triggers a redeploy of that service with the new value.
  Set a variable on every service that reads it (or use a shared variable) —
  `medusa` and `worker` both need the app secrets, for example.
- **Rotate forward, verify, then retire.** For anything with a live dependency
  (DB, sessions) prefer overlap: add the new secret, cut over, remove the old.
- **Never commit a secret.** Local secret-bearing files are git-ignored
  (`infra/monitoring/.env`, `services/monitoring/.env`, `.env*`). Gitleaks
  (pre-commit + CI) is the backstop.
- **After rotating, confirm the old value is dead** (auth fails with it).

## Blast-radius & cadence at a glance

| Secret                       | Store                                        | Rotating it disrupts                              | Cadence                              | Steps |
| ---------------------------- | -------------------------------------------- | ------------------------------------------------- | ------------------------------------ | ----- |
| `JWT_SECRET`                 | Railway (`medusa`, `worker`)                 | **Logs out all admin/customer sessions**          | 90d / on suspicion                   | §1    |
| `COOKIE_SECRET`              | Railway (`medusa`, `worker`)                 | Invalidates signed cookies (re-login)             | 90d / on suspicion                   | §1    |
| `REVALIDATE_SECRET`          | Railway (`medusa`, `storefront`)             | ISR revalidation webhook until both sides updated | 90d                                  | §1    |
| App DB password              | Supabase → Railway `DATABASE_URL`            | Brief app DB reconnect                            | 90d / on suspicion                   | §2    |
| `slink_exporter` DB password | Supabase role → monitoring `PG_EXPORTER_DSN` | postgres-exporter metrics gap (seconds)           | 90d                                  | §3    |
| Grafana admin password       | monitoring env (`GRAFANA_ADMIN_PASSWORD`)    | Grafana UI login                                  | 180d                                 | §4    |
| Bull Board password          | monitoring env (`BULL_BOARD_PASSWORD`)       | Bull Board UI login                               | 180d                                 | §4    |
| Monitoring API token         | monitoring env (`MONITORING_API_TOKEN`)      | Admin panel → Monitoring API calls                | 180d                                 | §4    |
| Medusa **publishable** key   | Medusa admin + storefront build arg          | Storefront → Medusa store API                     | on compromise                        | §5    |
| Supabase secret key          | Supabase → Railway `SUPABASE_SECRET_KEY`     | Backend Supabase API calls                        | 180d / on suspicion                  | §6    |
| PostHog personal API key     | monitoring env (when analytics armed)        | `/monitoring/analytics` reads                     | 180d                                 | §6    |
| `RESEND_API_KEY`             | Railway (`medusa`, `worker`)                 | Order + contact emails                            | 180d                                 | §6    |
| `RAILWAY_TOKEN`              | GitHub repo secret                           | The `deploy` workflow can't roll services         | 180d / on staff change               | §7    |
| GitHub PAT                   | local `completion.md` cred block             | CI/repo push                                      | **after roadmap complete** (task 16) | §7    |

There is no SSH key to rotate: Railway services are reached through the Railway
dashboard/CLI, authenticated by your Railway account, not by a key we hold.

---

## 0. The rotation mechanics (applies to every Railway secret)

1. Railway → the project → the **environment** → the service → **Variables**.
2. Edit the variable and save. Railway redeploys that service with the new value.
3. Repeat for every service that reads the same variable, **or** define it once as
   a shared variable and reference it as `${{shared.NAME}}` so there is a single
   place to change.

Via the CLI, equivalently:

```bash
railway variables --service medusa --set 'JWT_SECRET=<new-secret>'
```

Generate strong values with `openssl rand -base64 48` (secrets) /
`openssl rand -hex 32` (tokens). Never reuse a value across environments —
Railway environments are separate variable sets precisely so staging and prod
never share one.

---

## 1. App secrets — JWT / COOKIE / REVALIDATE

These are Medusa/Next signing secrets.

1. Set the new value(s) on every service that reads them: `JWT_SECRET` and
   `COOKIE_SECRET` on `medusa` + `worker`; `REVALIDATE_SECRET` on `medusa` +
   `storefront`.
2. Railway redeploys the affected services automatically.
3. **Expected impact:** rotating `JWT_SECRET`/`COOKIE_SECRET` **logs everyone
   out** — do it in a low-traffic window and post a heads-up. `REVALIDATE_SECRET`
   must match on both the Medusa emitter and the storefront receiver, so update
   them together (both redeploy within a minute of each other; a few revalidation
   calls in the gap will 401 and retry).
4. Verify: admin login works with a fresh session; old tokens are rejected.

## 2. Application database password

Overlap isn't available on a single database user, so do it fast:

1. Supabase → **Project Settings → Database → Reset database password**.
2. Copy the new **pooler** connection string and set `DATABASE_URL` on `medusa`
   and `worker`. The password is embedded in the URL, so this is one edit per
   service.
   - URL-encode the password if it contains `/ + = @ : ? #` — a raw reserved
     character silently mangles the URL and surfaces as a Postgres `28000` auth
     failure.
3. Railway redeploys both. Brief reconnect only.
4. Verify: `/monitoring/health` DB component green; app serves orders.

## 3. Postgres exporter role (`slink_exporter`) — task 28

The read-only monitoring role. Rotating it never touches app data.

1. Re-run the idempotent SQL with a new password (it `ALTER`s the existing role).
   Use the Supabase SQL editor, or psql against the project's direct endpoint:
   ```bash
   psql "$SUPABASE_DIRECT_URL" \
     -v exporter_password='<new>' -f config/postgres/exporter-role.sql
   ```
2. Update `PG_EXPORTER_DSN` (it embeds the password) in the monitoring env.
3. Restart just the exporter: `docker compose ... up -d postgres-exporter`.
4. Verify: `pg_up == 1` again in Prometheus within one scrape (~15s).

## 4. Admin-UI passwords + Monitoring API token

Grafana / Bull Board / Monitoring API token are all self-contained:

1. Set the new value in the monitoring stack's env
   (`GRAFANA_ADMIN_PASSWORD` / `BULL_BOARD_PASSWORD` / `MONITORING_API_TOKEN`).
2. Restart the one service (`grafana` / `bull-board` / the monitoring-api container).
   - Grafana: the admin password env only applies on first boot; to change an
     existing install use `grafana-cli admin reset-admin-password '<new>'` inside
     the container, then update the env to match.
3. For the Monitoring API token: also update the value the **admin panel** injects
   server-side, or the panel's calls 401.

## 5. Medusa publishable key

The storefront uses a **publishable** key (not a secret admin key) for the store
API. If it leaks it's low-severity, but rotate by creating a new publishable key
in Medusa admin (Settings → Publishable API keys), updating the
`NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` **repo variable**, re-running the `deploy`
workflow (the key is baked into the storefront bundle at image build time, so a
Railway variable change alone does nothing), then revoking the old key.

## 6. Third-party SaaS keys (Supabase / PostHog / Resend)

- **Supabase secret key:** Supabase → Project Settings → API keys → rotate.
  Update `SUPABASE_SECRET_KEY` on `medusa`/`worker`. The **publishable** key is
  public by design (it is baked into the browser bundle); rotating it requires a
  storefront image rebuild like §5.
- **PostHog personal API key:** rotate in PostHog → project settings; update the
  monitoring env; restart the monitoring-api. Public project key is not a secret.
- **Resend:** create a new API key in Resend → API Keys, set `RESEND_API_KEY` on
  `medusa`/`worker`, verify a send, then delete the old key. Re-verify SPF/DKIM
  unaffected (they're DNS records on the sending domain, not the key).

## 7. CI credentials — `RAILWAY_TOKEN` and the GitHub PAT

- **`RAILWAY_TOKEN`:** Railway → the project → **Settings → Tokens** → create a
  new **project** token, update the `RAILWAY_TOKEN` GitHub repo secret, run the
  `deploy` workflow once to confirm it works, then delete the old token. Keep it
  a _project_ token — an account token would give CI access to every project.
- **GitHub PAT:** the build-time PAT lives in the local `completion.md` credential
  block (git-ignored) and is scheduled to be **rotated after the whole roadmap is
  complete** (task 16). To rotate: create a new fine-grained PAT (repo scope),
  update the local git remote credential + any CI secret, then **delete the old
  PAT** in GitHub settings. If it ever landed in git history, a history scrub is
  also required (task 16 note).

---

## Verification checklist (after ANY rotation)

- [ ] New value saved in Railway (or the relevant provider) for **every** service
      that reads it.
- [ ] The service redeployed and is **healthy** (`/monitoring/health`).
- [ ] Old value now **fails** (auth rejected / connection refused).
- [ ] No secret written to logs, git, or an artifact (Gitleaks clean).
- [ ] Rotation noted with date; next-due date updated per the cadence table.
