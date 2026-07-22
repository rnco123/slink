import { test, expect } from "@playwright/test"
import { path } from "./support/routes"
import { gotoOk } from "./support/helpers"

/**
 * Cookie consent banner (roadmap task 61). Backend-free — runs in the default
 * suite. Note: the e2e storageState carries the coming-soon preview cookie but
 * NOT an analytics-consent cookie, so the banner should appear on first load.
 */
test.describe("Consent banner", () => {
  test("shows on first visit and Accept dismisses + persists", async ({
    page,
  }) => {
    await gotoOk(page, path("/about"))
    const banner = page.getByTestId("consent-banner")
    await expect(banner).toBeVisible()

    await page.getByTestId("consent-accept").click()
    await expect(banner).toBeHidden()

    // Choice persists across navigation (cookie set → banner stays gone).
    await gotoOk(page, path("/contact"))
    await expect(page.getByTestId("consent-banner")).toBeHidden()

    // The consent cookie records the granted choice.
    const cookies = await page.context().cookies()
    const consent = cookies.find((c) => c.name === "sl_analytics_consent")
    expect(consent?.value).toBe("granted")
  })

  test("Decline also dismisses and records the choice", async ({ page }) => {
    await gotoOk(page, path("/about"))
    await expect(page.getByTestId("consent-banner")).toBeVisible()

    await page.getByTestId("consent-decline").click()
    await expect(page.getByTestId("consent-banner")).toBeHidden()

    const cookies = await page.context().cookies()
    const consent = cookies.find((c) => c.name === "sl_analytics_consent")
    expect(consent?.value).toBe("denied")
  })
})
