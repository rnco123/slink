import { test, expect } from "@playwright/test"
import { ROUTES, gotoSection } from "./support/admin"

/**
 * Product Reviews moderation queue (roadmap task 23).
 *
 * Non-destructive: asserts the moderation UI renders and the status filter is
 * operable, without approving/rejecting (which would mutate the shared dev DB).
 * The submit → pending → approve → visible compliance loop is verified against a
 * throwaway DB by the HTTP integration suite (task 24, product-reviews.spec.ts).
 */
test.describe("Admin · Product Reviews moderation", () => {
  test.beforeEach(async ({ page }) => {
    await gotoSection(page, ROUTES.productReviews, /product reviews/i)
  })

  test("renders the moderation queue with the compliance guidance", async ({
    page,
  }) => {
    // The LegitScript/FTC guidance is intentional copy — it reminds moderators
    // why the approval gate exists. Assert it's present.
    await expect(
      page.getByText(/only.*approved.*reviews.*appear/i)
    ).toBeVisible()

    // Defaults to the Pending queue; the list area resolves to items or empty
    // state (never a stuck spinner).
    const resolved = page.getByText(/no pending reviews|verified purchase|★/i)
    await expect(resolved.first()).toBeVisible({ timeout: 20_000 })
  })

  test("status filter switches the queue", async ({ page }) => {
    // Radix-based Medusa UI Select.
    const filter = page.getByRole("combobox").first()
    await expect(filter).toBeVisible()

    await filter.click()
    await page.getByRole("option", { name: /^all$/i }).click()

    // Reloads into the "all" view — items render or the all-empty copy shows.
    await expect(
      page.getByText(/no all reviews|verified purchase|★/i).first()
    ).toBeVisible({ timeout: 20_000 })
  })

  test("moderation controls are present when a review exists", async ({
    page,
  }) => {
    // If the pending queue has any review, each row exposes Approve + Reject
    // actions. When empty, that's a valid state (nothing to moderate) — assert
    // the empty copy instead. Either way we never click (no dev-DB mutation).
    const approve = page.getByRole("button", { name: /^approve$/i })
    if (await approve.count()) {
      await expect(approve.first()).toBeVisible()
      await expect(
        page.getByRole("button", { name: /^reject$/i }).first()
      ).toBeVisible()
    } else {
      await expect(page.getByText(/no pending reviews/i)).toBeVisible()
    }
  })
})
