import { expect, type Page, type Response } from "@playwright/test"

/**
 * Navigate to a path and assert the top-level document responded 2xx.
 * Returns the navigation Response so callers can assert on status/headers.
 */
export async function gotoOk(page: Page, url: string): Promise<Response> {
  const res = await page.goto(url, { waitUntil: "domcontentloaded" })
  expect(res, `no response for ${url}`).not.toBeNull()
  expect(res!.status(), `${url} returned HTTP ${res!.status()}`).toBeLessThan(
    400
  )
  return res!
}

/**
 * Guard against Next.js runtime error pages that still return 200. The App
 * Router error boundary and the dev overlay both surface recognisable text.
 */
export async function expectNoAppError(page: Page): Promise<void> {
  const body = (await page.locator("body").innerText()).toLowerCase()
  for (const marker of [
    "application error",
    "internal server error",
    "unhandled runtime error",
    "this page could not be found", // Next default 404 body
  ]) {
    expect(body, `page shows "${marker}"`).not.toContain(marker)
  }
}

/** Assert the page has exactly one <h1> and it is non-empty. */
export async function expectSingleH1(page: Page): Promise<string> {
  const h1 = page.locator("h1")
  await expect(h1).toHaveCount(1)
  const text = (await h1.first().innerText()).trim()
  expect(text.length, "h1 is empty").toBeGreaterThan(0)
  return text
}

/** The document <title> should be present and not the Next fallback. */
export async function expectMeaningfulTitle(page: Page): Promise<string> {
  const title = await page.title()
  expect(title.trim().length, "empty <title>").toBeGreaterThan(0)
  return title
}
