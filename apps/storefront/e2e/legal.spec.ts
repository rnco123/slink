import { test, expect } from "@playwright/test"
import { path, LEGAL_SLUGS } from "./support/routes"
import {
  gotoOk,
  expectNoAppError,
  expectSingleH1,
  expectMeaningfulTitle,
} from "./support/helpers"

/**
 * The LegitScript trust stack — all ten legal documents.
 *
 * These pages are now served by the dynamic `/legal/[slug]` route, which pulls
 * its body + "Last updated" date from the Medusa content module
 * (`/store/content/pages/<slug>`). When that content is missing the route calls
 * `notFound()` and returns 404 — so the whole suite REQUIRES a seeded backend
 * and is tagged @commerce (excluded from the default backend-free run). Run it
 * with the backend up via `pnpm test:e2e:commerce`.
 */
test.describe("Legal / trust pages @commerce", () => {
  for (const slug of LEGAL_SLUGS) {
    test(`/legal/${slug} renders`, async ({ page }) => {
      await gotoOk(page, path(`/legal/${slug}`))
      await expectNoAppError(page)
      await expectSingleH1(page)

      const title = await expectMeaningfulTitle(page)
      expect(title).toMatch(/saludlink/i)

      // Body + "Last updated" line come from the CMS content module.
      await expect(page.getByText(/last updated/i).first()).toBeVisible()
    })
  }
})
