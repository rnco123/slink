import { test, expect } from "@playwright/test"
import { path, CONDITION_SLUGS } from "./support/routes"
import {
  gotoOk,
  expectNoAppError,
  expectSingleH1,
  expectMeaningfulTitle,
} from "./support/helpers"

test.describe("Conditions hub", () => {
  test("hub renders and links to all four verticals", async ({ page }) => {
    await gotoOk(page, path("/conditions"))
    await expectNoAppError(page)
    await expectSingleH1(page)

    for (const slug of CONDITION_SLUGS) {
      await expect(
        page.locator(`a[href$="/conditions/${slug}"]`).first(),
        `hub link ${slug}`
      ).toBeVisible()
    }
  })
})

test.describe("Condition verticals", () => {
  for (const slug of CONDITION_SLUGS) {
    test(`/conditions/${slug} renders with an h1 and breadcrumb JSON-LD`, async ({
      page,
    }) => {
      await gotoOk(page, path(`/conditions/${slug}`))
      await expectNoAppError(page)
      await expectSingleH1(page)
      await expectMeaningfulTitle(page)

      const ld = await page
        .locator('script[type="application/ld+json"]')
        .allTextContents()
      const types = ld.map((b) => JSON.parse(b)["@type"])
      expect(types).toContain("BreadcrumbList")
    })
  }

  test("unknown condition slug returns a 404", async ({ page }) => {
    const res = await page.goto(path("/conditions/not-a-real-condition"))
    expect(res?.status()).toBe(404)
  })
})
