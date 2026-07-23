# Saludlink — Operations Runbook (task 47)

**Audience:** whoever is on the keyboard when something breaks. Optimised for
*copy-paste under pressure*. Every command names the real resource. When a step
says "verify", actually run the check before moving on.

> Owner: Session 3 (monitoring). Companion docs:
> [ENVIRONMENT.md](../../../docs/ENVIRONMENT.md),
> [MIGRATIONS.md](../../../docs/MIGRATIONS.md),
> [secrets-rotation.md](secrets-rotation.md),
> deploy stack [`infra/deploy/`](../../deploy/).
> Alert definitions: [`config/prometheus/alerts/rules.yml`](../config/prometheus/alerts/rules.yml).

---

## 0. At a glance

| Thing              | Value                                                                    |
| ------------------ | ------------------------------------------------------------------------ |
| Public storefront  | `https://saludlinkusa.com` (+ `www.`) — behind the coming-soon wall      |
| Admin              | `https://manage.saludlinkusa.com` (Medusa login is the gate)             |
| EC2 (single box)   | `i-06ab3de34df6cbd8c` · t3.small · x86 Ubuntu 24.04 · **EIP 23.21.167.196** |
| SSH                | `ssh -i ~/.ssh/slink-key.pem ubuntu@23.21.167.196`                       |
| RDS                | `slink-db` · PG16.14 db.t4g.micro · `slink-db.cw10w44cq99y.us-east-1.rds.amazonaws.com` · **7-day PITR** |
| Route53 zone       | `Z06260013ISSB2PIIPCJS` (saludlinkusa.com)                               |
| VPC / SGs          | `vpc-07d2508f1b4689d26` · web `sg-02dbf31924ab776fb` · db `sg-0e1b28356a574f11c` |
| Media / key / AMI  | S3 `slink-media-537124932549` · key `slink-key` · AMI `ami-052355af2a014bd2c` |
| Secrets            | SSM `/slink/prod/*` (SecureString), region `us-east-1`                    |
| AWS access         | PowerShell: `$env:AWS_PROFILE='slink'` (account 537124932549, us-east-1) |
| Compose services   | `caddy · storefront · medusa · worker · medusa-migrate · redis` (on the box) |
| Compose file       | `~/slink/docker-compose.prod.yml` on the box (from `infra/deploy/`)       |

**Health endpoints** (the truth about "is it up"):

- Storefront: `https://saludlinkusa.com/api/health` → `{"status":"ok",...}`
- Medusa: `https://manage.saludlinkusa.com/health` → `OK`
- Monitoring API: internal `:3009/healthz`

**Where you'll see it first:** Alertmanager (`:9093`) / Grafana (`:3001`) /
Uptime Kuma (`:3002`), reached through the admin subdomain or an SSH tunnel:

```bash
ssh -i ~/.ssh/slink-key.pem -L 9093:localhost:9093 -L 3001:localhost:3001 -L 3002:localhost:3002 ubuntu@23.21.167.196
```

⛔ **Safety Rule #0:** only ever touch resources tagged `Project=slink`. The AWS
account is shared with **vonlinkage** — never stop/modify/delete anything else.

---

## 1. First 5 minutes (any incident)

1. **Confirm scope.** Is it the storefront, the admin, or both? Hit both health
   URLs above from your laptop.
2. **Check the alert.** Open Alertmanager → what's firing? Match it in §2.
3. **Reach the box.** `ssh -i ~/.ssh/slink-key.pem ubuntu@23.21.167.196`. If SSH
   times out → §3.1 (infra/network). If SSH works → §3.3 (app layer).
4. **Snapshot state before changing anything:**
   ```bash
   cd ~/slink && docker compose -f docker-compose.prod.yml ps
   docker compose -f docker-compose.prod.yml logs --tail=100 --no-color > /tmp/incident-$(date +%s).log
   ```
5. **Communicate.** Note start time + symptom. You'll need it for §7.

---

## 2. Alert → action index

Each alert in [`rules.yml`](../config/prometheus/alerts/rules.yml) maps to a play:

| Alert (severity)             | Means                                   | Go to |
| ---------------------------- | --------------------------------------- | ----- |
| `SiteProbeFailing` (crit)    | Public URL not returning 2xx            | §3    |
| `TargetDown` (crit)          | A scrape target is unreachable          | §3.3 / §3.5 |
| `PostgresDown` (crit)        | `pg_up==0`, DB unreachable              | §3.5  |
| `RedisDown` (crit)           | `redis_up==0`, event bus/queues down    | §3.6  |
| `HostLowDisk` (crit)         | <10% disk on the box                    | §3.7  |
| `SiteSlowResponse` (warn)    | processing >2s                          | §3.4  |
| `TLSCertExpiringSoon` (warn) | cert <14 days                           | §3.4  |
| `HostHighCpu/Memory` (warn)  | saturation                              | §3.7  |
| `PostgresTooManyConnections` | pool >85% of max                        | §3.5  |
| `RedisHighMemory` (warn)     | Redis near maxmemory                    | §3.6  |

---

## 3. Site-down triage (decision tree)

Work top-down; each rung eliminates a layer.

### 3.1 DNS + EIP (is the address even right?)

```bash
dig +short saludlinkusa.com          # expect 23.21.167.196
# From your laptop (PowerShell):  $env:AWS_PROFILE='slink'
aws ec2 describe-addresses --filters "Name=public-ip,Values=23.21.167.196" \
  --query "Addresses[0].{ip:PublicIp,instance:InstanceId,assoc:AssociationId}"
```

- DNS wrong → fix the A records in Route53 zone `Z06260013ISSB2PIIPCJS`
  (root/`www`/`manage` → `23.21.167.196`).
- EIP not associated with `i-06ab3de34df6cbd8c` → re-associate:
  ```bash
  aws ec2 associate-address --instance-id i-06ab3de34df6cbd8c --allocation-id <eipalloc-...>
  ```

### 3.2 Is the instance running?

```bash
aws ec2 describe-instance-status --instance-id i-06ab3de34df6cbd8c \
  --query "InstanceStatuses[0].{state:InstanceState.Name,sys:SystemStatus.Status,inst:InstanceStatus.Status}"
```

- `stopped` → `aws ec2 start-instances --instance-ids i-06ab3de34df6cbd8c` (EIP
  re-attaches automatically; wait ~60s).
- `running` but SSH refused → check SG `sg-02dbf31924ab776fb` allows your IP on
  22 (SSH is IP-restricted). If the box is wedged (failed status checks) →
  reboot: `aws ec2 reboot-instances --instance-ids i-06ab3de34df6cbd8c`. If it
  won't recover → **§6 re-provision**.

### 3.3 Are the containers up? (SSH in)

```bash
cd ~/slink && docker compose -f docker-compose.prod.yml ps
```

- A service is `Exit`/`Restarting` → read its logs:
  `docker compose -f docker-compose.prod.yml logs --tail=200 <service>`.
- Bring the stack up: `docker compose -f docker-compose.prod.yml up -d`.
- If an image is broken/new deploy is bad → **§4 rollback**.

### 3.4 Caddy / TLS (edge)

`caddy` terminates TLS and routes hostnames. Symptoms: cert errors, 502s.

```bash
docker compose -f docker-compose.prod.yml logs --tail=100 caddy
curl -sI https://saludlinkusa.com | head -5
```

- 502 from Caddy → the upstream (`storefront`/`medusa`) is down → §3.3.
- Cert failing to issue → check the box can reach ports 80/443 inbound
  (SG `sg-02dbf31924ab776fb`) and DNS points here; Caddy needs the A record live
  to solve the ACME challenge. Force renew: `docker compose ... restart caddy`.

### 3.5 Postgres (RDS)

```bash
aws rds describe-db-instances --db-instance-identifier slink-db \
  --query "DBInstances[0].{status:DBInstanceStatus,az:AvailabilityZone,ep:Endpoint.Address}"
# from the box, test connectivity (uses the app DB creds from SSM/.env):
docker compose -f docker-compose.prod.yml exec medusa sh -lc 'pg_isready -h $DB_HOST -p 5432 || echo DOWN'
```

- RDS not `available` → wait out the maintenance/backup, or restore (**§5**).
- Reachable but app can't connect → SG `sg-0e1b28356a574f11c` must allow 5432
  **from `sg-02dbf31924ab776fb` only**; verify the `database_url` SSM param.
- `PostgresTooManyConnections` → find leaks: connections are visible in Grafana
  (Postgres panel); restart `worker`/`medusa` to drop stale pools if needed.

### 3.6 Redis (queues / event bus)

```bash
docker compose -f docker-compose.prod.yml exec redis redis-cli ping   # expect PONG
docker compose -f docker-compose.prod.yml logs --tail=50 redis
```

- Redis down → `docker compose ... up -d redis`. Medusa's event bus + BullMQ
  workflow engine depend on it; the `worker` will recover once Redis is back.
- `RedisHighMemory` → check `redis-cli info memory`; queues may be backed up
  (see Bull Board `:3003` / `/monitoring/queues`).

### 3.7 Host resources

```bash
df -h /                      # HostLowDisk
free -m                      # HostHighMemory
docker system df             # is Docker eating the disk?
```

- Low disk (common cause: logs/images) →
  `docker system prune -af --volumes=false` (⚠ never `--volumes` — that wipes
  `redis_data`/`caddy_data`). Rotate app logs. The box has a 2GB swap file.
- Sustained CPU/mem pressure on t3.small → consider a temporary bump to
  t3.medium (stop → change instance type → start; EIP persists).

---

## 4. Rollback (bad deploy)

The deploy pushes GHCR images `ghcr.io/rnco123/slink-medusa` and
`…/slink-storefront`, referenced by `${MEDUSA_IMAGE}` / `${STOREFRONT_IMAGE}`
(default `:latest`) in `docker-compose.prod.yml`.

```bash
cd ~/slink
# 1. Identify the last-good tag/digest. If per-commit tags exist (task 44), pick
#    the previous SHA; otherwise list what's cached locally:
docker images | grep slink
# 2. Pin the images to the good version and restart JUST the app services:
export MEDUSA_IMAGE=ghcr.io/rnco123/slink-medusa:<good-sha>
export STOREFRONT_IMAGE=ghcr.io/rnco123/slink-storefront:<good-sha>
docker compose -f docker-compose.prod.yml up -d medusa worker storefront
# 3. Verify health (below) before declaring recovery.
```

> ⚠ **Migrations:** if the bad release ran a forward DB migration
> (`medusa-migrate`), a code rollback alone may mismatch the schema. This is why
> migrations MUST be expand→contract ([MIGRATIONS.md](../../../docs/MIGRATIONS.md)):
> the previous image keeps working against the new schema. If a *destructive*
> migration shipped, you need §5 (restore) — do not roll code back over a dropped
> column.
>
> **Gap (task 44):** per-commit image tags + "keep last 5" + a one-command
> rollback script are not yet wired; until then, rollback is the manual pin
> above. Persist the good SHA in the deploy notes after every release.

**Verify recovery (after any fix):**

```bash
curl -s https://saludlinkusa.com/api/health         # {"status":"ok"}
curl -s https://manage.saludlinkusa.com/health      # OK
# and watch SiteProbeFailing clear in Alertmanager
```

---

## 5. Database restore (RDS PITR / snapshot)

RDS keeps **7 days** of automated backups + transaction logs (PITR).

**Point-in-time restore (to just before the bad event):**

```bash
$env:AWS_PROFILE='slink'   # PowerShell
aws rds restore-db-instance-to-point-in-time `
  --source-db-instance-identifier slink-db `
  --target-db-instance-identifier slink-db-restore `
  --restore-time 2026-07-23T14:05:00Z `
  --db-subnet-group-name <slink-subnet-group> `
  --vpc-security-group-ids sg-0e1b28356a574f11c `
  --no-multi-az --db-instance-class db.t4g.micro
```

Then **cut over**:

1. Wait until `slink-db-restore` is `available`
   (`aws rds describe-db-instances --db-instance-identifier slink-db-restore`).
2. Sanity-check the data on the restored instance (connect, spot-check orders).
3. Repoint the app: update the `database_url` SSM param
   (`/slink/prod/database_url`) to the restore endpoint, rebuild `.env` on the
   box (`infra/deploy/build-env.sh`), `docker compose ... up -d medusa worker`.
4. Once confirmed, rename/retire the old instance. Keep it a few days before
   deleting.

**Restore from a specific snapshot** (if PITR window insufficient):

```bash
aws rds describe-db-snapshots --db-instance-identifier slink-db \
  --query "reverse(sort_by(DBSnapshots,&SnapshotCreateTime))[:5].[DBSnapshotIdentifier,SnapshotCreateTime]"
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier slink-db-restore \
  --db-snapshot-identifier <snapshot-id> --db-instance-class db.t4g.micro
```

> **Untested until task 45.** This procedure has NOT been drilled yet (task 45 =
> the restore drill). Do a rehearsal restore into `slink-db-restore` and throw it
> away, so the first real run isn't the first run.

---

## 6. Re-provision the box from scratch (<1 hour, worst case)

The box is **cattle**: RDS (data) + S3 (media) + SSM (secrets) survive
independently, so a lost EC2 instance is recoverable by rebuilding the compute.

1. **Launch a replacement** (same AMI, SG, key, subnet — all `Project=slink`):
   ```bash
   aws ec2 run-instances --image-id ami-052355af2a014bd2c --instance-type t3.small \
     --key-name slink-key --security-group-ids sg-02dbf31924ab776fb \
     --subnet-id subnet-007e20282ed2479d2 \
     --tag-specifications 'ResourceType=instance,Tags=[{Key=Project,Value=slink},{Key=Name,Value=slink-web}]' \
     --user-data file://infra/deploy/bootstrap.sh    # installs Docker + swap
   ```
2. **Move the EIP** to the new instance (address stays `23.21.167.196`, DNS
   unchanged):
   ```bash
   aws ec2 associate-address --instance-id <new-id> --allocation-id <eipalloc-...>
   ```
3. **Deploy the stack:** copy `infra/deploy/*` to `~/slink`, run
   `build-env.sh` (pulls `/slink/prod/*` from SSM into `.env`), then
   `docker compose -f docker-compose.prod.yml pull && up -d`. The
   `medusa-migrate` one-shot runs migrations against the *existing* RDS (no data
   loss).
4. **Verify** health endpoints + Alertmanager clears. Bring the monitoring stack
   back up too (`infra/monitoring/`).

Time budget: launch ~3m, EIP ~30s, image pull ~5–10m, boot+migrate ~3m → well
under an hour. The long pole is image pull; keeping images small keeps this fast.

> **Gaps:** EBS snapshot schedule (task 46) + backup restore drill (task 45) make
> this faster/safer and are still open. A `bootstrap.sh` matching the original
> user-data should live in `infra/deploy/` (deploy session owns it).

---

## 7. After the incident

- Silence resolved alerts in Alertmanager only after confirming green.
- Write a short timeline: detection → cause → fix → verification (use the
  `/tmp/incident-*.log` you captured in §1).
- File follow-ups against the gaps this incident exposed (link the task numbers).
- If a secret was exposed during triage → [secrets-rotation.md](secrets-rotation.md).
- Update this runbook if a step was wrong or missing. A runbook is only as good
  as its last real use.
