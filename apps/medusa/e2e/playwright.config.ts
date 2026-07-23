import { defineConfig, devices } from "@playwright/test"
import path from "node:path"

/**
 * Playwright config for the Saludlink MEDUSA ADMIN UI (roadmap task 23).
 *
 * Scope: the custom admin sections built on top of the Medusa dashboard —
 * Content & Policies (/app/content) and Product Reviews moderation
 * (/app/product-reviews). This is separate from the storefront's suite
 * (apps/storefront/e2e) and owns its own config + fixtures.
 *
 * Backend dependency
 * ------------------
 * These specs drive a REAL, running admin at :9000 backed by a seeded dev DB,
 * and authenticate as the seeded owner. That makes them local/integration
 * (opt-in) — like the storefront's @commerce suite — NOT part of the default CI
 * unit/integration lane. Run them with:
 *
 *   # start the backend first (separate terminal): pnpm --filter @saludlink/medusa dev
 *   pnpm --filter @saludlink/medusa test:e2e:admin
 *
 * Point at an already-running admin with ADMIN_BASE_URL; override the login with
 * ADMIN_EMAIL / ADMIN_PASSWORD (defaults are the seeded local owner).
 */

const PORT = Number(process.env.MEDUSA_PORT ?? 9000)
const baseURL = process.env.ADMIN_BASE_URL ?? `http://localhost:${PORT}`

// Managed server is opt-in: `medusa develop` is heavy and needs Postgres/Redis,
// so by default we assume the admin is already running and just reuse it.
const manageServer = process.env.ADMIN_MANAGE_SERVER === "1"

export const STORAGE_STATE = path.join(
  __dirname,
  ".artifacts",
  "admin-state.json"
)

export default defineConfig({
  testDir: ".",
  testMatch: /.*\.spec\.ts/,
  outputDir: "./.artifacts/test-results",
  // Log in once, reuse the authenticated storage state across specs.
  globalSetup: "./support/global-setup.ts",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 2 : 3,
  reporter: [
    ["list"],
    ["html", { outputFolder: "./.artifacts/report", open: "never" }],
  ],
  use: {
    baseURL,
    storageState: STORAGE_STATE,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: manageServer
    ? {
        command: "pnpm dev",
        url: `${baseURL}/health`,
        timeout: 240_000,
        reuseExistingServer: !process.env.CI,
        stdout: "pipe",
        stderr: "pipe",
      }
    : undefined,
})
