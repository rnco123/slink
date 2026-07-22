import { test, expect } from "@playwright/test"
import { path, LEGAL_SLUGS } from "./support/routes"
import {
  gotoOk,
  expectNoAppError,
  expectSingleH1,
  expectMeaningfulTitle,
} from "./support/helpers"

/**
 * The LegitScript trust stack — all ten legal documents must be reachable,
 * error-free, and carry the shared LegalLayout chrome (h1 + "Last updated"
 * timestamp + Saludlink-suffixed <title>).
 */
test.describe("Legal / trust pages", () => {
  for (const slug of LEGAL_SLUGS) {
    test(`/legal/${slug} renders`, async ({ page }) => {
      await gotoOk(page, path(`/legal/${slug}`))
      await expectNoAppError(page)
      await expectSingleH1(page)

      const title = await expectMeaningfulTitle(page)
      expect(title).toMatch(/saludlink/i)

      // LegalLayout always stamps a "Last updated" line.
      await expect(page.getByText(/last updated/i).first()).toBeVisible()
    })
  }
})
