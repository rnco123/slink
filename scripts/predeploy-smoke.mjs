#!/usr/bin/env node
/**
 * Pre-deploy prod-mode smoke ritual (roadmap tasks 78–81).
 * -------------------------------------------------------------------------
 * Run BEFORE every deploy. Boots BOTH apps the way production runs them and
 * exercises the critical paths, so a broken prod build / missing env / bundle
 * regression is caught locally instead of in production.
 *
 * Phases:
 *   78  build   — prod build both apps (`medusa build`, `next build`)
 *   81  bundle  — bundle-size budget on the storefront build
 *   78  start   — `medusa start` + `next start` (production runtime)
 *   79  health  — GET /health (medusa) + /api/health (storefront) → 200
 *   80  e2e     — both Playwright suites (backend-free + @commerce) vs the
 *                 prod-mode boot
 *   (always) teardown — stop both servers
 *
 * Usage:
 *   pnpm predeploy                 # full ritual
 *   SMOKE_SKIP_BUILD=1 pnpm predeploy   # reuse existing builds (faster reruns)
 *   SMOKE_SKIP_COMMERCE=1 pnpm predeploy # backend-free e2e only
 *
 * ENVIRONMENT: production `start` runs the strict env validators (task 74). This
 * script must be invoked with a prod-like env loaded:
 *   - storefront: NEXT_PUBLIC_BASE_URL (https), REVALIDATE_SECRET (strong),
 *     PREVIEW_CODE, NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY.
 *   - medusa: JWT_SECRET/COOKIE_SECRET (strong), https *_CORS, and a NON-local
 *     DATABASE_URL — `apps/medusa/src/lib/env.ts` rejects a localhost DB in
 *     production by design. To smoke fully on a local DB, either point
 *     DATABASE_URL at a non-local endpoint or add a narrow `PREDEPLOY_SMOKE`
 *     escape to env.ts (see the handoff note). In CI/staging the DB is already
 *     non-local, so no escape is needed there.
 * -------------------------------------------------------------------------
 */
import { spawn } from "node:child_process"
import { cpSync, existsSync } from "node:fs"
import { setTimeout as sleep } from "node:timers/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, "..")
const isWin = process.platform === "win32"

const SKIP_BUILD = !!process.env.SMOKE_SKIP_BUILD
const SKIP_COMMERCE = !!process.env.SMOKE_SKIP_COMMERCE

const MEDUSA_URL = process.env.SMOKE_MEDUSA_URL ?? "http://localhost:9000"
const STOREFRONT_URL =
  process.env.SMOKE_STOREFRONT_URL ?? "http://localhost:8000"

const started = [] // { name, child } — tracked for teardown

function log(step, msg) {
  console.log(`\n▶ [${step}] ${msg}`)
}

/** Run a command to completion; reject on non-zero exit. */
function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd: ROOT,
      stdio: "inherit",
      shell: isWin, // pnpm is a .cmd shim on Windows
      ...opts,
    })
    child.on("error", reject)
    child.on("exit", (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`${cmd} ${args.join(" ")} exited ${code}`))
    )
  })
}

/** Spawn a long-lived server; keep a handle for teardown. */
function startServer(name, cmd, args, env, cwd = ROOT) {
  const child = spawn(cmd, args, {
    cwd,
    stdio: "inherit",
    shell: isWin,
    env: { ...process.env, ...env },
    detached: !isWin, // own process group on posix so we can signal the tree
  })
  started.push({ name, child })
  child.on("exit", (code) => {
    // A server exiting early (before teardown) is a smoke failure.
    if (!tearingDown && code !== 0 && code !== null) {
      console.error(`\n❌ ${name} exited early with code ${code}`)
    }
  })
  return child
}

async function waitForHealth(url, label, timeoutMs = 180_000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { redirect: "manual" })
      if (res.ok) {
        log("health", `${label} ${url} → ${res.status} ✅`)
        return
      }
    } catch {
      // not up yet
    }
    await sleep(2000)
  }
  throw new Error(
    `${label} did not become healthy at ${url} within ${timeoutMs / 1000}s`
  )
}

let tearingDown = false
async function teardown() {
  if (tearingDown) return
  tearingDown = true
  log("teardown", "stopping servers")
  for (const { name, child } of started) {
    if (child.exitCode !== null) continue
    try {
      if (isWin) {
        // Kill the whole tree (pnpm → node) on Windows.
        spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], {
          stdio: "ignore",
        })
      } else {
        process.kill(-child.pid, "SIGTERM")
      }
    } catch {
      // best-effort
    }
    console.log(`  stopped ${name}`)
  }
}

async function main() {
  // ---- 78: build --------------------------------------------------------
  if (SKIP_BUILD) {
    log("build", "SMOKE_SKIP_BUILD set — reusing existing builds")
  } else {
    log("build", "prod build: medusa")
    await run("pnpm", ["--filter", "@saludlink/medusa", "build"])
    log("build", "prod build: storefront")
    await run("pnpm", ["--filter", "@saludlink/storefront", "build"])
  }

  // ---- 81: bundle budget ------------------------------------------------
  log("bundle", "bundle-size budget")
  await run("node", ["scripts/check-bundle-size.mjs"])

  // ---- 78: start (production runtime) -----------------------------------
  log("start", "medusa start")
  startServer("medusa", "pnpm", ["--filter", "@saludlink/medusa", "start"])
  await waitForHealth(`${MEDUSA_URL}/health`, "medusa")

  // Storefront prod = the STANDALONE server (matches apps/storefront/Dockerfile),
  // NOT `next start` — which warns and isn't the real entrypoint for
  // `output: "standalone"`. `next build` doesn't copy static/public into the
  // standalone tree (the Dockerfile does), so we stage them the same way here.
  log("start", "staging standalone assets")
  const sfDir = join(ROOT, "apps", "storefront")
  const standaloneRoot = join(sfDir, ".next", "standalone")
  const serverEntry = join(standaloneRoot, "apps", "storefront", "server.js")
  if (!existsSync(serverEntry)) {
    throw new Error(
      `Standalone server not found at ${serverEntry} — did \`next build\` (output: standalone) run?`
    )
  }
  cpSync(
    join(sfDir, ".next", "static"),
    join(standaloneRoot, "apps", "storefront", ".next", "static"),
    { recursive: true }
  )
  if (existsSync(join(sfDir, "public"))) {
    cpSync(
      join(sfDir, "public"),
      join(standaloneRoot, "apps", "storefront", "public"),
      { recursive: true }
    )
  }

  log("start", "storefront standalone server")
  // Entry is `apps/storefront/server.js` RELATIVE to the standalone root (the
  // standalone bundle preserves the monorepo layout), so run it from there —
  // exactly as the Dockerfile does after copying the tree to /app.
  startServer(
    "storefront",
    "node",
    ["apps/storefront/server.js"],
    { NODE_ENV: "production", PORT: "8000", HOSTNAME: "0.0.0.0" },
    standaloneRoot
  )

  // ---- 79: health -------------------------------------------------------
  await waitForHealth(`${STOREFRONT_URL}/api/health`, "storefront")

  // ---- 80: e2e vs prod-mode boot ----------------------------------------
  const e2eEnv = {
    PLAYWRIGHT_BASE_URL: STOREFRONT_URL,
    E2E_SKIP_WARMUP: "1", // prod build is already warm
    CI: "1",
  }
  log("e2e", "backend-free Playwright suite")
  await run("pnpm", ["--filter", "@saludlink/storefront", "test:e2e"], {
    env: { ...process.env, ...e2eEnv },
  })

  if (SKIP_COMMERCE) {
    log("e2e", "SMOKE_SKIP_COMMERCE set — skipping @commerce suite")
  } else {
    log("e2e", "@commerce Playwright suite (needs seeded backend)")
    await run(
      "pnpm",
      ["--filter", "@saludlink/storefront", "test:e2e:commerce"],
      { env: { ...process.env, ...e2eEnv } }
    )
  }

  log("done", "✅ pre-deploy smoke passed")
}

// Ensure servers are always cleaned up.
for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, async () => {
    await teardown()
    process.exit(1)
  })
}

main()
  .then(async () => {
    await teardown()
    process.exit(0)
  })
  .catch(async (err) => {
    console.error(`\n❌ pre-deploy smoke failed: ${err.message}`)
    await teardown()
    process.exit(1)
  })
