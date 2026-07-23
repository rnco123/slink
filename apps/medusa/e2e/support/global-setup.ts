import { chromium, type FullConfig } from "@playwright/test"
import fs from "node:fs"
import path from "node:path"
import { login } from "./admin"
import { STORAGE_STATE } from "../playwright.config"

/**
 * Global setup for the admin UI suite (roadmap task 23).
 *
 * Logs in once via the real admin login form and persists the authenticated
 * storage state, which every spec then loads (see playwright.config `use.storageState`).
 * Fails loudly with an actionable message if the admin isn't reachable — this
 * suite is opt-in and needs a running, seeded backend.
 */
export default async function globalSetup(config: FullConfig) {
  const baseURL =
    process.env.ADMIN_BASE_URL ??
    config.projects[0]?.use?.baseURL ??
    `http://localhost:${process.env.MEDUSA_PORT ?? 9000}`

  fs.mkdirSync(path.dirname(STORAGE_STATE), { recursive: true })

  const browser = await chromium.launch()
  try {
    const page = await browser.newPage()
    try {
      await login(page, baseURL)
    } catch (err) {
      throw new Error(
        `Admin login failed at ${baseURL}. This suite needs a running, seeded ` +
          `Medusa admin (owner login) — start it with ` +
          `\`pnpm --filter @saludlink/medusa dev\` and ensure the owner is seeded. ` +
          `Original error: ${(err as Error).message}`
      )
    }
    await page.context().storageState({ path: STORAGE_STATE })
  } finally {
    await browser.close()
  }
}
