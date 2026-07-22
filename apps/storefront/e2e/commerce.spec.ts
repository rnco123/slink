import { test, expect } from "@playwright/test"
import { path } from "./support/routes"
import { gotoOk, expectNoAppError } from "./support/helpers"

/**
 * Commerce surfaces backed by Medusa. Tagged @commerce so they only run when a
 * seeded backend is available:
 *
 *   E2E_INCLUDE_COMMERCE=1 pnpm test:e2e
 *
 * (see playwright.config.ts grepInvert). Assertions lean on the storefront's
 * stable data-testid hooks rather than product copy, which varies with seed data.
 */
test.describe("Commerce @commerce", () => {
  test("store lists products", async ({ page }) => {
    await gotoOk(page, path("/store"))
    await expectNoAppError(page)
    await expect(page.getByTestId("products-list")).toBeVisible()
    // At least one product tile from the seed.
    await expect(
      page.getByTestId("products-list").locator("li, a").first()
    ).toBeVisible()
  })

  test("empty cart shows the empty-cart message", async ({ page }) => {
    await gotoOk(page, path("/cart"))
    await expectNoAppError(page)
    await expect(page.getByTestId("empty-cart-message")).toBeVisible()
  })

  test("account (logged-out) renders the login form", async ({ page }) => {
    await gotoOk(page, path("/account"))
    await expectNoAppError(page)
    await expect(page.getByTestId("login-page")).toBeVisible()
    await expect(page.getByTestId("email-input")).toBeVisible()
    await expect(page.getByTestId("password-input")).toBeVisible()
    await expect(page.getByTestId("sign-in-button")).toBeVisible()
  })

  test("login form validates required fields", async ({ page }) => {
    await gotoOk(page, path("/account"))
    // Native required attributes gate submission without a backend round-trip.
    await expect(page.getByTestId("email-input")).toHaveAttribute(
      "required",
      ""
    )
    await expect(page.getByTestId("password-input")).toHaveAttribute(
      "required",
      ""
    )
  })

  test("can switch from login to the register form", async ({ page }) => {
    await gotoOk(page, path("/account"))
    await page.getByTestId("register-button").click()
    await expect(page.getByTestId("register-page")).toBeVisible()
    await expect(page.getByTestId("first-name-input")).toBeVisible()
  })

  test("adding a product to cart updates the cart", async ({ page }) => {
    // Open the first product from the store grid.
    await gotoOk(page, path("/store"))
    await page.getByTestId("products-list").locator("a").first().click()
    await expect(page).toHaveURL(/\/products\//)
    await expectNoAppError(page)

    const addButton = page.getByRole("button", { name: /add to cart/i }).first()
    if (await addButton.isEnabled().catch(() => false)) {
      await addButton.click()
      // Cart count / nav-cart-link reflects the addition.
      await expect(page.getByTestId("nav-cart-link")).toContainText(/[1-9]/, {
        timeout: 15_000,
      })
    } else {
      test.info().annotations.push({
        type: "note",
        description:
          "Add-to-cart disabled (no variant/inventory in seed) — skipped interaction.",
      })
    }
  })
})
