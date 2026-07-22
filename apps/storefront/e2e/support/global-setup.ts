import { request, type FullConfig } from "@playwright/test"
import { CONTENT_ROUTES, LOCALES, path } from "./routes"

/**
 * Global setup — warm the dev server before the suite runs.
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
  if (process.env.E2E_SKIP_WARMUP) return

  const baseURL =
    process.env.PLAYWRIGHT_BASE_URL ??
    config.projects[0]?.use?.baseURL ??
    `http://localhost:${process.env.STOREFRONT_PORT ?? 8000}`

  const ctx = await request.newContext({ baseURL })

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
