import { test, expect } from "@playwright/test"
import { path } from "./support/routes"
import { gotoOk } from "./support/helpers"

/**
 * Age gate (roadmap task 21c). Tagged @commerce — needs a seeded backend with a
 * product flagged `requires_age_verification` (see
 * apps/medusa/src/scripts/set-age-restriction.ts, which flags
 * `metabolic-support-berberine-capsules`).
 *
 * A non-flagged product (bariatric-protein-shake-vanilla) must NOT show the gate.
 */
const GATED = path("/products/metabolic-support-berberine-capsules")
const UNGATED = path("/products/bariatric-protein-shake-vanilla")

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

  test("non-flagged product does NOT show the gate", async ({ page }) => {
    await gotoOk(page, UNGATED)
    await expect(page.getByTestId("age-gate")).toHaveCount(0)
    await expect(page.getByTestId("product-container")).toBeVisible()
  })
})
