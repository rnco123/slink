import { Page, expect } from "@playwright/test"

/**
 * Shared constants + helpers for the admin UI suite (roadmap task 23).
 */

// Seeded local owner (see completion.md / quick-login widget). Override via env
// for other environments.
export const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "owner@saludlinkusa.com"
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "Saludlink#2026"

// Custom admin route paths (src/admin/routes/<name> → /app/<name>).
export const ROUTES = {
  content: "/app/content",
  articles: "/app/articles",
  siteSettings: "/app/site-settings",
  productReviews: "/app/product-reviews",
} as const

/**
 * Log into the Medusa admin through the real login form. Used by global-setup to
 * capture an authenticated storage state, and provider-agnostic (whatever the
 * dashboard persists — cookie or token — is captured by storageState).
 */
export async function login(
  page: Page,
  baseURL: string,
  email = ADMIN_EMAIL,
  password = ADMIN_PASSWORD
): Promise<void> {
  await page.goto(`${baseURL}/app/login`, { waitUntil: "domcontentloaded" })

  const emailInput = page.locator('input[name="email"], input[type="email"]')
  const passwordInput = page.locator(
    'input[name="password"], input[type="password"]'
  )
  await emailInput.first().waitFor({ state: "visible", timeout: 60_000 })
  await emailInput.first().fill(email)
  await passwordInput.first().fill(password)

  await page
    .getByRole("button", { name: /continue|log ?in|sign ?in/i })
    .first()
    .click()

  // Land on the dashboard: the URL leaves /login and the app shell renders.
  await page.waitForURL(/\/app(?!\/login)/, { timeout: 60_000 })
  await expect(page.locator("main, [role='main']").first()).toBeVisible({
    timeout: 60_000,
  })
}

/**
 * Navigate to a custom admin route and wait for its heading. The dashboard is a
 * client-side SPA, so we wait on the rendered heading rather than a full load.
 */
export async function gotoSection(
  page: Page,
  route: string,
  heading: RegExp
): Promise<void> {
  await page.goto(route, { waitUntil: "domcontentloaded" })
  await expect(
    page.getByRole("heading", { name: heading }).first()
  ).toBeVisible({ timeout: 30_000 })
}
