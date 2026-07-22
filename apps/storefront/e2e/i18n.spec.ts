import { test, expect } from "@playwright/test"
import { path } from "./support/routes"
import { gotoOk, expectNoAppError } from "./support/helpers"

test.describe("Locale routing (middleware)", () => {
  test("bare '/' redirects to a locale-prefixed URL", async ({ page }) => {
    await page.goto("/")
    await expect(page).toHaveURL(/\/(en|es)\/?$/)
  })

  test("bare '/about' redirects preserving the path", async ({ page }) => {
    await page.goto("/about")
    await expect(page).toHaveURL(/\/(en|es)\/about\/?$/)
  })

  test("<html lang> matches the URL locale", async ({ page }) => {
    await gotoOk(page, path("/", "en"))
    await expect(page.locator("html")).toHaveAttribute("lang", "en")

    await gotoOk(page, path("/", "es"))
    await expect(page.locator("html")).toHaveAttribute("lang", "es")
  })

  test("Spanish pages render Spanish chrome", async ({ page }) => {
    await gotoOk(page, path("/", "es"))
    await expectNoAppError(page)
    // Trust-strip ticker copy is Spanish (also appears in the shipping nudge,
    // so take the first match).
    await expect(
      page.getByText(/Env[íi]o gratis en pedidos/i).first()
    ).toBeVisible()
    // Nav uses the Spanish "Nosotros" label for About (the hidden mobile-menu
    // copy comes first in the DOM, so filter to the visible one).
    await expect(
      page.locator('a[href$="/about"]:visible').first()
    ).toBeVisible()
    await expect(
      page.getByRole("link", { name: "Nosotros" }).first()
    ).toBeVisible()
  })
})

test.describe("Language switcher", () => {
  test("switching to ES moves to the /es URL and sets the cookie", async ({
    page,
    context,
  }) => {
    await gotoOk(page, path("/about", "en"))

    const group = page.getByRole("group", { name: "Language" }).first()
    await group.scrollIntoViewIfNeeded()
    await group.getByRole("button", { name: "ES" }).click()

    await expect(page).toHaveURL(/\/es\/about\/?$/)

    // Cookie persists the choice for the next visit.
    const cookies = await context.cookies()
    const locale = cookies.find((c) => c.name === "NEXT_LOCALE")
    expect(locale?.value).toBe("es")

    // <html lang> only flips on a full server request (it's derived from the
    // x-locale header, not client state). Reload to confirm the SSR value.
    await page.reload()
    await expect(page.locator("html")).toHaveAttribute("lang", "es")
  })

  test("switching back to EN returns to the /en URL", async ({ page }) => {
    await gotoOk(page, path("/about", "es"))
    const group = page.getByRole("group", { name: "Language" }).first()
    await group.scrollIntoViewIfNeeded()
    await group.getByRole("button", { name: "EN" }).click()
    await expect(page).toHaveURL(/\/en\/about\/?$/)
  })
})
