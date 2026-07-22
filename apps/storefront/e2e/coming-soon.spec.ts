import { test, expect } from "@playwright/test"

/**
 * Coming-soon wall (roadmap task 82).
 *
 * The wall is enabled in ALL environments, so the rest of the suite carries a
 * preview cookie (global-setup → storageState). These specs deliberately start
 * with a CLEAN state to exercise the gate itself, then prove the code unlocks it.
 */
test.use({ storageState: { cookies: [], origins: [] } })

test.describe("coming-soon wall", () => {
  test("a gated visitor is walled on any route (rewrite, not redirect)", async ({
    page,
  }) => {
    await page.goto("/en")
    // URL stays as requested — the wall is a rewrite, not a redirect.
    expect(new URL(page.url()).pathname).toBe("/en")
    await expect(page.getByText(/launching soon/i)).toBeVisible()
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      /metabolic health/i
    )
  })

  test("the store is walled too", async ({ page }) => {
    await page.goto("/en/store")
    await expect(page.getByText(/launching soon/i)).toBeVisible()
  })

  test("a wrong code is rejected", async ({ page }) => {
    await page.goto("/coming-soon")
    await page.getByRole("button", { name: /have a preview code/i }).click()
    await page.getByLabel(/preview code/i).fill("000000")
    await page.getByRole("button", { name: /^enter$/i }).click()
    // Scope to our error node — Next injects its own empty role="alert" announcer.
    await expect(page.locator("#preview-error")).toContainText(/isn.?t right/i)
    // Still walled.
    await expect(page.getByText(/launching soon/i)).toBeVisible()
  })

  test("the correct code unlocks the real site", async ({ page }) => {
    await page.goto("/coming-soon")
    await page.getByRole("button", { name: /have a preview code/i }).click()
    await page.getByLabel(/preview code/i).fill("900800")
    await page.getByRole("button", { name: /^enter$/i }).click()
    // Cookie set server-side → middleware lets us onto the localized home page.
    await page.waitForURL(/\/(en|es)(\/|$)/, { timeout: 20_000 })
    await expect(page.getByText(/launching soon/i)).toHaveCount(0)
  })

  test("the health endpoint stays reachable while walled", async ({
    request,
  }) => {
    const res = await request.get("/api/health")
    expect(res.ok()).toBeTruthy()
    const body = await res.json()
    expect(body.status).toBe("ok")
  })
})
