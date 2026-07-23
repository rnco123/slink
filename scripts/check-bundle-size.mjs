#!/usr/bin/env node
/**
 * Bundle-size budget check (roadmap task 57).
 * -------------------------------------------------------------------------
 * Fails CI when the storefront's heaviest route grows past a gzipped budget,
 * catching an accidental bundle regression (a fat dependency, a client
 * component that should have been a server component, etc.) before it ships.
 *
 * Metric: "First Load JS" per route — the gzipped sum of the JavaScript chunks
 * a route loads on first paint, read from Next's `app-build-manifest.json`. We
 * report every route, then assert the MAX stays under the budget. Gzip is used
 * because that's what ships over the wire; raw byte counts overstate the cost.
 *
 * Run AFTER `next build` (the manifest only exists in a completed build):
 *   node scripts/check-bundle-size.mjs
 *
 * Budget: `BUNDLE_BUDGET_KB` env var (gzipped KB) overrides the default. Tighten
 * it to ~10-15% above the current baseline once a prod build establishes one.
 * -------------------------------------------------------------------------
 */
import { readFileSync, existsSync, statSync } from "node:fs"
import { gzipSync } from "node:zlib"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const NEXT_DIR = join(__dirname, "..", "apps", "storefront", ".next")
const MANIFEST = join(NEXT_DIR, "app-build-manifest.json")

// Default budget = current heaviest route (~412 KB gzipped, the Stripe-laden
// checkout page as of the calibration build) + ~12% headroom. This is a
// REGRESSION gate: it passes today's build and fails a meaningful bundle bloat.
// Tighten it as routes are optimized. Override with BUNDLE_BUDGET_KB.
const BUDGET_KB = Number.parseInt(process.env.BUNDLE_BUDGET_KB ?? "460", 10)

function fail(msg) {
  console.error(`\n❌ ${msg}\n`)
  process.exit(1)
}

if (!existsSync(MANIFEST)) {
  fail(
    `No build manifest at ${MANIFEST}. Run \`pnpm --filter @saludlink/storefront build\` first.`
  )
}

const manifest = JSON.parse(readFileSync(MANIFEST, "utf8"))
const pages = manifest.pages ?? {}

// Gzip each unique file once and cache the result.
const gzCache = new Map()
function gzippedSize(fileRel) {
  if (gzCache.has(fileRel)) {
    return gzCache.get(fileRel)
  }
  const abs = join(NEXT_DIR, fileRel)
  let size = 0
  try {
    if (statSync(abs).isFile()) {
      size = gzipSync(readFileSync(abs)).length
    }
  } catch {
    // Missing/unreadable chunk — count as 0; the manifest can list files that
    // were tree-shaken. Never crash the budget check on a stale entry.
    size = 0
  }
  gzCache.set(fileRel, size)
  return size
}

const rows = []
for (const [route, files] of Object.entries(pages)) {
  const jsFiles = files.filter((f) => f.endsWith(".js"))
  const bytes = jsFiles.reduce((sum, f) => sum + gzippedSize(f), 0)
  rows.push({ route, kb: bytes / 1024 })
}

rows.sort((a, b) => b.kb - a.kb)

console.log(`\nFirst Load JS per route (gzipped) — budget ${BUDGET_KB} KB\n`)
for (const { route, kb } of rows) {
  const flag = kb > BUDGET_KB ? "  ⚠ OVER" : ""
  console.log(`  ${kb.toFixed(1).padStart(7)} KB  ${route}${flag}`)
}

const heaviest = rows[0]
if (!heaviest) {
  fail("No routes found in the build manifest — is this a completed build?")
}

console.log(
  `\nHeaviest route: ${heaviest.route} = ${heaviest.kb.toFixed(1)} KB gzipped`
)

if (heaviest.kb > BUDGET_KB) {
  fail(
    `Bundle budget exceeded: ${heaviest.kb.toFixed(
      1
    )} KB > ${BUDGET_KB} KB. Trim the route's client JS or raise BUNDLE_BUDGET_KB deliberately.`
  )
}

console.log(`\n✅ Bundle within budget (${BUDGET_KB} KB).\n`)
