import { request, type FullConfig } from "@playwright/test"
import fs from "node:fs"
import path0 from "node:path"
import { CONTENT_ROUTES, LOCALES, path } from "./routes"

// Coming-soon wall (task 82) — keep in sync with src/lib/preview.ts. The wall is
// enabled in all environments, so the suite must carry the preview cookie or
// every navigation lands on /coming-soon. We persist it to a storageState the
// Playwright projects load (see playwright.config.ts `use.storageState`).
export const PREVIEW_COOKIE = "preview_ok"
export const PREVIEW_TOKEN = "sl-preview-granted"
export const PREVIEW_STATE_PATH = path0.join(
  __dirname,
  "..",
  ".artifacts",
  "preview-state.json"
)

/**
 * Global setup — grant the preview cookie, then warm the dev server.
 *
 * Against `next dev` (Turbopack), the very first request pays a large one-time
 * project-compile cost, and each route is compiled on its first hit. Without
 * warming, the first few tests race that compile and flake with timeouts or
 * `ERR_ABORTED`. Here we sequentially GET each route once (long per-request
 * budget) so that by the time tests start, every route is compiled and fast.
 *
 * Skipped when pointing at an already-running/warm instance
 * (`PLAYWRIGHT_BASE_URL`) or when explicitly disabled (`E2E_SKIP_WARMUP`).
 */
export default async function globalSetup(config: FullConfig) {
  const baseURL =
    process.env.PLAYWRIGHT_BASE_URL ??
    config.projects[0]?.use?.baseURL ??
    `http://localhost:${process.env.STOREFRONT_PORT ?? 8000}`

  const host = new URL(baseURL).hostname

  // Persist a storageState carrying the preview cookie so specs start past the
  // wall. Written even when warmup is skipped, so the projects always load it.
  fs.mkdirSync(path0.dirname(PREVIEW_STATE_PATH), { recursive: true })
  fs.writeFileSync(
    PREVIEW_STATE_PATH,
    JSON.stringify({
      cookies: [
        {
          name: PREVIEW_COOKIE,
          value: PREVIEW_TOKEN,
          domain: host,
          path: "/",
          httpOnly: true,
          secure: false,
          sameSite: "Lax",
          expires: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30,
        },
      ],
      origins: [],
    }),
    "utf8"
  )

  if (process.env.E2E_SKIP_WARMUP) return

  // Warm with the preview cookie attached so we compile the REAL routes, not the
  // coming-soon wall page.
  const ctx = await request.newContext({
    baseURL,
    storageState: PREVIEW_STATE_PATH,
  })

  // 1) Wait for the server to answer at all (absorbs the initial compile).
  const deadline = Date.now() + 240_000
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const res = await ctx.get(path("/", "en"), { timeout: 120_000 })
      if (res.ok()) break
    } catch {
      // server still booting — retry until the deadline
    }
    if (Date.now() > deadline) {
      await ctx.dispose()
      throw new Error("Storefront did not become ready within 240s")
    }
  }

  // 2) Pre-compile every content route in both locales so per-test navigations
  //    hit warm routes. Failures here are non-fatal — the specs will report.
  const routes = LOCALES.flatMap((l) => CONTENT_ROUTES.map((r) => path(r, l)))
  routes.push("/robots.txt", "/sitemap.xml")

  for (const url of routes) {
    try {
      await ctx.get(url, { timeout: 120_000 })
    } catch {
      // ignore — warming is best-effort
    }
  }

  await ctx.dispose()
}
