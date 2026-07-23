import { test, expect } from "@playwright/test"
import { ROUTES, gotoSection } from "./support/admin"

/**
 * Content & Policies admin editor (roadmap task 23).
 *
 * Non-destructive: asserts the mini-CMS section renders and its editor is
 * operable (open the "New page" modal, see the real fields) WITHOUT persisting
 * to the shared dev DB. The full create/update/delete + published-only read
 * contract is verified against a throwaway DB by the HTTP integration suite
 * (task 24, content-crud.spec.ts).
 */
test.describe("Admin · Content & Policies", () => {
  test.beforeEach(async ({ page }) => {
    await gotoSection(page, ROUTES.content, /content\s*&?\s*policies/i)
  })

  test("renders the content section with a create action", async ({ page }) => {
    await expect(page.getByRole("button", { name: /new page/i })).toBeVisible()

    // Either seeded pages render, or the empty-state copy shows — both valid,
    // never a broken/loading-forever state.
    const loaded = page.getByText(/(no pages yet|\/[a-z0-9-]+)/i)
    await expect(loaded.first()).toBeVisible({ timeout: 20_000 })
  })

  test("opens the page editor with the expected fields", async ({ page }) => {
    await page.getByRole("button", { name: /new page/i }).click()

    // FocusModal editor with the real content fields.
    await expect(page.getByRole("heading", { name: /new page/i })).toBeVisible()
    await expect(page.getByText("Slug", { exact: true })).toBeVisible()
    await expect(page.getByText("Title", { exact: true })).toBeVisible()
    await expect(page.getByText(/body \(markdown\)/i)).toBeVisible()

    // A Save action exists — but we do NOT save (keep the dev DB clean).
    await expect(page.getByRole("button", { name: /^save$/i })).toBeVisible()

    // Close without persisting.
    await page.keyboard.press("Escape")
    await expect(page.getByRole("heading", { name: /new page/i })).toBeHidden({
      timeout: 10_000,
    })
  })
})
