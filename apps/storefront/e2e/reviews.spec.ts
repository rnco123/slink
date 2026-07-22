import { test, expect } from "@playwright/test"
import { path } from "./support/routes"
import { gotoOk, expectNoAppError } from "./support/helpers"

/**
 * Product reviews on the PDP (roadmap task 21b). Tagged @commerce — needs a
 * seeded Medusa backend:
 *
 *   E2E_INCLUDE_COMMERCE=1 pnpm test:e2e
 *
 * These are structural / auth-path assertions (seed-copy-independent): the
 * reviews section + submit form render on every PDP, and submitting while
 * logged out surfaces the sign-in prompt (proving the auth gate end-to-end).
 * The full submit→moderate→appears loop is covered by the backend integration
 * smoke; only APPROVED reviews are ever returned by the API, so nothing
 * unmoderated can render here.
 */
test.describe("Product reviews @commerce", () => {
  // Navigate straight to a seeded product PDP (deterministic; this product also
  // carries the seeded approved reviews). Avoids the store-grid client-nav flake.
  const PDP = path("/products/bariatric-protein-shake-vanilla")

  async function openFirstPdp(page: import("@playwright/test").Page) {
    await gotoOk(page, PDP)
    await expect(page).toHaveURL(/\/products\//)
    await expectNoAppError(page)
  }

  test("PDP renders the reviews section and submit form", async ({ page }) => {
    await openFirstPdp(page)

    const section = page.getByTestId("product-reviews")
    await expect(section).toBeVisible()
    await expect(
      section.getByRole("heading", { name: /customer reviews/i })
    ).toBeVisible()

    // Submit form with a rating picker is present.
    const form = page.getByTestId("review-form")
    await expect(form).toBeVisible()
    await expect(
      form.getByRole("radiogroup", { name: /rating/i })
    ).toBeVisible()
  })

  test("submitting while logged out prompts sign-in", async ({ page }) => {
    await openFirstPdp(page)

    const form = page.getByTestId("review-form")
    await form.scrollIntoViewIfNeeded()

    // Pick 5 stars, write a valid body, submit.
    await form.getByRole("radio", { name: /5 stars/i }).click()
    await form
      .locator("#review-content")
      .fill("Great product, arrived quickly and as described.")
    await form.getByRole("button", { name: /submit review/i }).click()

    // The server action returns 401 (no session) → the form swaps to a sign-in
    // prompt rather than silently failing.
    await expect(page.getByText(/sign in to write a review/i)).toBeVisible()
    await expect(
      page.getByRole("link", { name: /sign in to your account/i })
    ).toBeVisible()
  })

  test("approved reviews show a star summary when present", async ({
    page,
  }) => {
    await openFirstPdp(page)
    const section = page.getByTestId("product-reviews")
    await expect(section).toBeVisible()

    // If this product has approved reviews, the summary stars + review items
    // render; otherwise the empty-state copy shows. Either is valid — assert we
    // never render a broken/unmoderated state.
    const items = section.getByTestId("review-item")
    const count = await items.count()
    if (count > 0) {
      // Each rendered review carries a star rating role-image with an a11y label.
      await expect(items.first().getByRole("img")).toBeVisible()
    } else {
      await expect(section.getByText(/no .*reviews/i).first()).toBeVisible()
    }
  })
})
