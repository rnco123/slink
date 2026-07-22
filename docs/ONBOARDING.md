# Dev Onboarding

_Roadmap task 66. Get a fresh machine building and both apps running. Windows
quirks called out inline — they have cost real hours._

## Prerequisites

- **Node 22** (see `.nvmrc`). `engines` require `>=22`; CI pins 22. Don't use a
  newer major locally and assume CI matches.
- **pnpm 9.15.9** (`packageManager` field). `corepack enable` then `corepack
prepare pnpm@9.15.9 --activate`.
- **Docker Desktop** — Postgres 16 + Redis 7 run in compose.

## First boot

```sh
pnpm install
docker compose up -d          # Postgres + Redis
cp apps/medusa/.env.template apps/medusa/.env
cp apps/storefront/.env.template apps/storefront/.env.local

cd apps/medusa
npx medusa db:migrate
pnpm seed                      # catalog + regions
npx medusa exec ./src/scripts/seed-content.ts   # legal pages EN+ES
cd ../..

pnpm dev                       # boots medusa :9000 + storefront :8000
```

- Storefront: http://localhost:8000/en (or `/es`). The **coming-soon wall is ON
  in every environment** (task 82) — enter `900800` once; the ~30-day preview
  cookie lets you back through.
- Admin: http://localhost:9000/app — `owner@saludlinkusa.com` / `Saludlink#2026`.
- Demo customer: `demo@saludlinkusa.com` / `Demo#2026`.

## Windows quirks (this host) ⚠️

These are the traps that waste time on Windows/PowerShell:

1. **Use `127.0.0.1`, never `localhost`, in `DATABASE_URL`/`REDIS_URL`.** On
   Windows, `localhost` resolves to IPv6 `::1` first; Postgres listens on IPv4,
   so Medusa hangs at boot with a misleading _"pool is probably full"_ error.
2. **Refresh `PATH` in each new PowerShell session** (installers update the
   machine/user PATH but the running shell doesn't pick it up):
   ```powershell
   $env:Path = [System.Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [System.Environment]::GetEnvironmentVariable('Path','User')
   ```
3. **`pnpm` is a `.cmd` shim.** To background a dev server, launch through cmd:
   `cmd /c "pnpm dev > dev.log 2>&1"`. Calling the shim via `node` directly
   fails.
4. **The Bash tool's node is broken** on this host — run node/pnpm/aws through
   **PowerShell**. Prefix aws with `$env:AWS_PROFILE='slink'`.
5. **`turbo` DLL crash (exit 3221225781 / 0xC0000135)** has been seen when the
   VC++ runtime PATH isn't loaded — refreshing PATH (quirk 2) resolves it.
6. **Stale `.next/standalone` symlinks** can make recursive `Get-ChildItem`
   throw `DirectoryNotFound`; ignore or `rm -rf apps/storefront/.next`.

## Everyday commands

| Command                                                 | What it does                                             |
| ------------------------------------------------------- | -------------------------------------------------------- |
| `pnpm dev`                                              | Both apps (turbo).                                       |
| `pnpm build`                                            | Build all. Medusa build generates `.medusa/types`.       |
| `pnpm typecheck`                                        | All packages. **Run `build` first** so Medusa has types. |
| `pnpm lint`                                             | ESLint (storefront) via turbo.                           |
| `pnpm format`                                           | Prettier write. `format:check` in CI.                    |
| `pnpm check:env`                                        | Env template drift check (task 60).                      |
| `pnpm test`                                             | Unit tests (privacy vitest today).                       |
| `pnpm --filter @saludlink/storefront test:e2e`          | Playwright (backend-free).                               |
| `pnpm --filter @saludlink/storefront test:e2e:commerce` | +commerce specs.                                         |

## Repo layout

```
apps/storefront   Next.js 15 App Router, [countryCode] i18n (en/es), standalone
apps/medusa       Medusa v2 backend + admin; custom content + audit-log modules
packages/privacy  PHI Boundary Firewall (captureSafeEvent, safe-logger, schemas)
packages/ui       Design tokens / shared UI
docs/             plan, tasks, env contract, migrations, this file
```

## Before you push

Husky runs `prettier` (pre-commit) and `turbo run typecheck` (pre-push). CI is
the real gate: `format:check → check:env → lint → build → typecheck → test`.
Read `docs/ENVIRONMENT.md` before touching env vars and `docs/MIGRATIONS.md`
before writing a migration.
