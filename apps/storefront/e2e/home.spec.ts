import { test, expect } from "@playwright/test"
import { path } from "./support/routes"
import {
  gotoOk,
  expectNoAppError,
  expectSingleH1,
  expectMeaningfulTitle,
} from "./support/helpers"

test.describe("Home page", () => {
  test.beforeEach(async ({ page }) => {
    await gotoOk(page, path("/"))
  })

  test("renders the editorial hero with primary CTAs", async ({ page }) => {
    await expectNoAppError(page)
    const h1 = await expectSingleH1(page)
    expect(h1.toLowerCase()).toContain("metabolic health")

    // Both hero CTAs are present and route into the app.
    await expect(
      page.getByRole("link", { name: /shop products/i })
    ).toBeVisible()
    await expect(
      page.getByRole("link", { name: /explore telehealth/i })
    ).toBeVisible()
  })

  test("has a meaningful <title> and meta description", async ({ page }) => {
    const title = await expectMeaningfulTitle(page)
    expect(title.toLowerCase()).toContain("metabolic")
    const desc = page.locator('head meta[name="description"]')
    await expect(desc).toHaveAttribute("content", /saludlink/i)
  })

  test("renders each marketing section (trust, conditions, how-it-works, care)", async ({
    page,
  }) => {
    await expect(
      page.getByRole("heading", { name: /find what fits your health goals/i })
    ).toBeVisible()
    await expect(
      page.getByRole("heading", { name: /a simpler path to metabolic health/i })
    ).toBeVisible()
    await expect(
      page.getByRole("heading", { name: /talk to a licensed provider/i })
    ).toBeVisible()
  })

  test("condition grid links to each vertical hub", async ({ page }) => {
    for (const slug of [
      "weight-management",
      "metabolic-health",
      "nutrition",
      "monitoring",
    ]) {
      await expect(
        page.locator(`a[href$="/conditions/${slug}"]`).first()
      ).toBeVisible()
    }
  })

  test("emits Organization + WebSite JSON-LD structured data", async ({
    page,
  }) => {
    const blocks = await page
      .locator('script[type="application/ld+json"]')
      .allTextContents()
    expect(blocks.length).toBeGreaterThanOrEqual(2)
    // A node's @type may be a string or an array (the Organization node is
    // ["Organization","MedicalOrganization"]) — flatten before asserting.
    const types = blocks.flatMap((b) => {
      const t = JSON.parse(b)["@type"]
      return Array.isArray(t) ? t : [t]
    })
    expect(types).toContain("Organization")
    expect(types).toContain("WebSite")
  })

  test("shop-products CTA points at the locale-prefixed store", async ({
    page,
  }) => {
    // Assert the href rather than navigating — /store needs the Medusa backend
    // (covered under @commerce). This keeps the home suite backend-free.
    await expect(
      page.getByRole("link", { name: /shop products/i }).first()
    ).toHaveAttribute("href", /\/(en|es)\/store\/?$/)
  })
})
