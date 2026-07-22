import { test, expect, type Page } from "@playwright/test"
import {
  path,
  PRIMARY_NAV,
  COMPANY_LINKS,
  CONDITION_SLUGS,
  LEGAL_SLUGS,
} from "./support/routes"
import { gotoOk } from "./support/helpers"

/** On mobile the primary nav lives behind the hamburger; open it if present. */
async function revealPrimaryNav(page: Page): Promise<void> {
  const burger = page.getByRole("button", { name: /open menu/i })
  if (await burger.isVisible().catch(() => false)) {
    await burger.click()
  }
}

test.describe("Global navigation", () => {
  test.beforeEach(async ({ page }) => {
    await gotoOk(page, path("/"))
  })

  test("header exposes every primary nav destination", async ({ page }) => {
    await revealPrimaryNav(page)
    for (const item of PRIMARY_NAV) {
      // On desktop the inline nav is shown; on mobile the (now-open) panel is.
      // The hidden set is filtered out with :visible.
      await expect(
        page.locator(`a[href$="${item.href}"]:visible`).first(),
        `nav link ${item.href}`
      ).toBeVisible()
    }
  })

  test("account and cart links are present in the header", async ({ page }) => {
    // Cart link may be behind Suspense fallback or the resolved CartButton;
    // both expose data-testid="nav-cart-link".
    await expect(page.getByTestId("nav-cart-link")).toBeVisible()
    // Account link is desktop-only in the header.
    const account = page.getByTestId("nav-account-link")
    if (await account.count()) {
      await expect(account.first()).toHaveAttribute(
        "href",
        /\/(en|es)\/account$/
      )
    }
  })

  test("clicking About navigates to the about page", async ({ page }) => {
    await revealPrimaryNav(page)
    await page.locator('a[href$="/about"]:visible').first().click()
    await expect(page).toHaveURL(/\/(en|es)\/about\/?$/)
    await expect(page.locator("h1")).toBeVisible()
  })

  test("footer links to every legal / company / condition destination", async ({
    page,
  }) => {
    const footer = page.locator("footer")
    await footer.scrollIntoViewIfNeeded()

    for (const slug of LEGAL_SLUGS) {
      await expect(
        footer.locator(`a[href$="/legal/${slug}"]`).first(),
        `footer legal link ${slug}`
      ).toHaveCount(1)
    }
    for (const slug of CONDITION_SLUGS) {
      await expect(
        footer.locator(`a[href$="/conditions/${slug}"]`).first(),
        `footer condition link ${slug}`
      ).toHaveCount(1)
    }
    for (const link of COMPANY_LINKS) {
      await expect(
        footer.locator(`a[href$="${link.href}"]`).first(),
        `footer company link ${link.href}`
      ).toHaveCount(1)
    }
  })

  test("logo links back to the localized home", async ({ page }) => {
    await gotoOk(page, path("/about"))
    await page.getByRole("link", { name: /saludlink home/i }).click()
    await expect(page).toHaveURL(/\/(en|es)\/?$/)
  })
})

test.describe("Mobile menu", () => {
  test.beforeEach(async ({ page }) => {
    await gotoOk(page, path("/"))
  })

  test("hamburger opens and Escape closes the panel", async ({ page }) => {
    const burger = page.getByRole("button", { name: /open menu/i })
    test.skip(
      !(await burger.isVisible().catch(() => false)),
      "desktop viewport — no hamburger"
    )

    await burger.click()
    await expect(
      page.getByRole("button", { name: /close menu/i })
    ).toBeVisible()
    // Nav items become reachable in the open panel.
    await expect(page.locator('a[href$="/conditions"]').first()).toBeVisible()

    await page.keyboard.press("Escape")
    await expect(page.getByRole("button", { name: /open menu/i })).toBeVisible()
  })
})
