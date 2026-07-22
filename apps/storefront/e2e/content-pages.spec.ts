import { test, expect } from "@playwright/test"
import { path } from "./support/routes"
import {
  gotoOk,
  expectNoAppError,
  expectSingleH1,
  expectMeaningfulTitle,
} from "./support/helpers"

/**
 * Marketing / informational pages that render for an anonymous visitor.
 * Each must: respond 2xx, show no error boundary, have a single non-empty h1,
 * and carry a meaningful <title>.
 */
const PAGES = [
  { route: "/about", titleIncludes: /about|saludlink/i },
  { route: "/contact", titleIncludes: /contact/i },
  { route: "/licensing", titleIncludes: /licens|availab/i },
  { route: "/telemedicine", titleIncludes: /telehealth|telemedicine/i },
] as const

test.describe("Content pages", () => {
  for (const { route, titleIncludes } of PAGES) {
    test(`${route} renders correctly`, async ({ page }) => {
      await gotoOk(page, path(route))
      await expectNoAppError(page)
      await expectSingleH1(page)
      const title = await expectMeaningfulTitle(page)
      expect(title).toMatch(titleIncludes)
    })
  }

  test("contact page exposes support email + address", async ({ page }) => {
    await gotoOk(page, path("/contact"))
    // The global footer also carries a support mailto + address, so scope to the
    // main content and take the first match.
    const main = page.locator("main")
    await expect(
      main.locator('a[href^="mailto:support@saludlinkusa.com"]').first()
    ).toBeVisible()
    await expect(main.locator("address").first()).toBeVisible()
  })

  test("telemedicine page shows the FAQ and state-availability content", async ({
    page,
  }) => {
    await gotoOk(page, path("/telemedicine"))
    await expect(
      page.getByRole("heading", { name: /frequently asked questions/i })
    ).toBeVisible()
    await expect(
      page.getByRole("heading", { name: /where telehealth is available/i })
    ).toBeVisible()
  })

  test("telemedicine 'Start a visit' points at the external care app", async ({
    page,
  }) => {
    await gotoOk(page, path("/telemedicine"))
    const cta = page.getByRole("link", { name: /start a visit/i }).first()
    await expect(cta).toHaveAttribute(
      "href",
      /care\.saludlinkusa\.com|utm_source=storefront/
    )
  })
})
