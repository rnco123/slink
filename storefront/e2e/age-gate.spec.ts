import { test, expect } from "@playwright/test"
import { path } from "./support/routes"
import { gotoOk } from "./support/helpers"

/**
 * Age gate (roadmap task 21c). Tagged @commerce — needs a seeded backend.
 * The full catalog is compounded prescription medications (see
 * backend/src/scripts/seed.ts), so every SKU sets
 * `requires_age_verification: true` inline — there is no non-gated product
 * to assert against anymore.
 */
const GATED = path("/products/tirzepatide-injection-at-home")

test.describe("Age gate @commerce", () => {
  test("flagged product shows the age gate", async ({ page }) => {
    await gotoOk(page, GATED)
    const gate = page.getByTestId("age-gate")
    await expect(gate).toBeVisible()
    await expect(
      gate.getByRole("heading", { name: /age verification/i })
    ).toBeVisible()
    await expect(page.getByTestId("age-gate-confirm")).toBeVisible()
    await expect(page.getByTestId("age-gate-decline")).toBeVisible()
  })

  test("confirming dismisses the gate and reveals the product", async ({
    page,
  }) => {
    await gotoOk(page, GATED)
    await expect(page.getByTestId("age-gate")).toBeVisible()

    await page.getByTestId("age-gate-confirm").click()

    // Cookie set + refresh → gate gone, PDP content visible.
    await expect(page.getByTestId("age-gate")).toBeHidden()
    await expect(page.getByTestId("product-container")).toBeVisible()
  })

  test("declining shows the under-age message", async ({ page }) => {
    await gotoOk(page, GATED)
    await page.getByTestId("age-gate-decline").click()
    await expect(page.getByText(/must be at least 18 years old/i)).toBeVisible()
  })
})
