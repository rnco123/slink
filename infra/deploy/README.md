# Saludlink Deploy (single-box)

Roadmap tasks 33 (infra) + 35 (CI/CD). One EC2 `t3.small` runs the whole stack
via Docker Compose behind Caddy; Postgres is managed RDS.

## Live infra (account 537124932549, all `Project=slink`)

| Resource     | Value                                                    |
| ------------ | -------------------------------------------------------- |
| App box      | EC2 `i-06ab3de34df6cbd8c` (t3.small, Ubuntu 24.04 amd64) |
| Elastic IP   | `23.21.167.196`                                          |
| RDS          | `slink-db` (Postgres 16.14, db.t4g.micro, private)       |
| VPC / subnet | `vpc-07d2508f1b4689d26` / `subnet-007e20282ed2479d2`     |
| SG (web)     | `sg-02dbf31924ab776fb` (80/443 public, SSH from op IP)   |
| SG (db)      | `sg-0e1b28356a574f11c` (5432 ← web SG only)              |
| SSH key      | `slink-key` → `~/.ssh/slink-key.pem`                     |
| Media bucket | `slink-media-537124932549`                               |

Secrets live in **SSM Parameter Store** under `/slink/prod/*`
(`jwt_secret`, `cookie_secret`, `revalidate_secret`, `db_password`,
`database_url`). DNS is operator-managed (not provisioned here); point
`saludlinkusa.com` / `www` / `manage.` A-records at the EIP and Caddy issues TLS.

## Images

`.github/workflows/deploy.yml` builds both images on push to `main` and pushes to
GHCR:

- `ghcr.io/rnco123/slink-storefront:latest` (+ commit SHA tag)
- `ghcr.io/rnco123/slink-medusa:latest` (+ commit SHA tag)

The storefront's `NEXT_PUBLIC_*` are **build args** (baked into the bundle).

## First deploy (from the operator host, which has the slink AWS creds)

The box has no IAM instance profile by design (Safety Rule #0 — no IAM changes on
the shared account), so the `.env` is built locally from SSM and copied up:

```sh
# 1. Build .env from SSM + the RDS endpoint (writes ./.env locally)
bash infra/deploy/build-env.sh > .env.prod

# 2. Copy stack files to the box
scp -i ~/.ssh/slink-key.pem \
  infra/deploy/docker-compose.prod.yml infra/deploy/Caddyfile .env.prod \
  ubuntu@23.21.167.196:/opt/slink/

# 3. On the box: rename env, log in to GHCR, pull + up
ssh -i ~/.ssh/slink-key.pem ubuntu@23.21.167.196 '
  cd /opt/slink &&
  mv -f .env.prod .env &&
  mv -f docker-compose.prod.yml docker-compose.yml &&
  echo "$GHCR_PAT" | docker login ghcr.io -u rnco123 --password-stdin &&
  docker compose pull &&
  docker compose up -d
'
```

The `medusa-migrate` one-shot runs DB migrations before the server/worker start.
Health: storefront `/api/health`, medusa `/health`.

## Redeploys

Handled by `deploy.yml` after CI is green: build → push GHCR → SSH → `docker
compose pull && up -d`. Rollback = pin `MEDUSA_IMAGE`/`STOREFRONT_IMAGE` to a
previous SHA tag in `.env` and re-up (task 44).
