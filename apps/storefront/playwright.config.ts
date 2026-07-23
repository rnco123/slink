import { defineConfig, devices } from "@playwright/test"

/**
 * Playwright end-to-end configuration for the Saludlink storefront.
 *
 * Base URL / server strategy
 * --------------------------
 * - By default we boot the Next.js dev server (`pnpm dev`, port 8000) and run
 *   the suite against it. Set `PLAYWRIGHT_BASE_URL` to point at an already
 *   running instance (e.g. a preview deploy) — the managed webServer is then
 *   skipped automatically.
 *
 * Backend dependency
 * ------------------
 * Marketing / legal / SEO / i18n pages render for an anonymous visitor without
 * touching Medusa (cart + customer lookups short-circuit to null when there is
 * no session cookie — see lib/data/cart.ts + customer.ts). Those specs run with
 * the storefront alone.
 *
 * Specs tagged `@commerce` exercise store / cart / account surfaces that need a
 * seeded Medusa backend. They are excluded from the default run; opt in with
 * `pnpm test:e2e:commerce` once the backend is up.
 */

const PORT = Number(process.env.STOREFRONT_PORT ?? 8000)
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${PORT}`

// When an external base URL is provided we never manage our own server.
const useManagedServer = !process.env.PLAYWRIGHT_BASE_URL

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./e2e/.artifacts/test-results",
  // Warm the dev server (absorb Turbopack's first cold compile) before tests.
  globalSetup: "./e2e/support/global-setup.ts",
  // Generous timeouts: against `next dev`, the first hit to each route pays a
  // Turbopack cold-compile cost, which compounds under parallelism.
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // A flaky first compile shouldn't fail the run; one retry covers cold-start.
  retries: process.env.CI ? 2 : 1,
  // Cap workers so parallel cold-compiles don't thrash the single dev server.
  workers: process.env.CI ? 2 : 4,
  // Exclude backend-dependent commerce specs unless explicitly opted in.
  grepInvert: process.env.E2E_INCLUDE_COMMERCE ? undefined : /@commerce/,
  reporter: process.env.CI
    ? [
        ["github"],
        ["html", { outputFolder: "./e2e/.artifacts/report", open: "never" }],
      ]
    : [
        ["list"],
        ["html", { outputFolder: "./e2e/.artifacts/report", open: "never" }],
      ],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      // Preview cookie (written by global-setup) so specs start past the
      // coming-soon wall, which is enabled in all environments (task 82). The
      // wall spec opts out per-test with an empty storageState.
      use: {
        ...devices["Desktop Chrome"],
        storageState: "./e2e/.artifacts/preview-state.json",
      },
    },
    {
      name: "mobile-chrome",
      use: {
        ...devices["Pixel 7"],
        storageState: "./e2e/.artifacts/preview-state.json",
      },
      // Mobile-only concerns (hamburger menu) live in navigation.spec.ts.
      testMatch: /navigation\.spec\.ts/,
    },
  ],
  webServer: useManagedServer
    ? {
        command: "pnpm dev",
        url: baseURL,
        timeout: 240_000,
        reuseExistingServer: !process.env.CI,
        stdout: "pipe",
        stderr: "pipe",
        // The coming-soon wall is enabled in ALL environments (task 82):
        // global-setup writes the preview cookie so specs start past it, and
        // coming-soon.spec clears the cookie to exercise the gate + robots.txt
        // Disallow. Boot the managed dev server with the wall UP so those hold.
        // PREVIEW_CODE defaults to 900800 (the value coming-soon.spec enters).
        env: {
          ...(process.env as Record<string, string>),
          COMING_SOON: "true",
          PREVIEW_CODE: process.env.PREVIEW_CODE ?? "900800",
        },
      }
    : undefined,
})
