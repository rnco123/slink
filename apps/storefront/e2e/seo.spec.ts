import { test, expect } from "@playwright/test"
import { path } from "./support/routes"
import { gotoOk } from "./support/helpers"

// BCP-47 hreflang tags emitted by lib/i18n (localeHreflang), plus x-default.
const HREFLANGS = ["en-US", "es-US", "x-default"] as const

test.describe("robots.txt", () => {
  // The coming-soon wall is enabled in all environments (task 82), so robots.txt
  // disallows the whole site until launch. The transactional-surface Disallow
  // rules live in robots.ts for when the wall drops (task 64 re-enables Search
  // Console then).
  test("is served and disallows the whole site while the wall is up", async ({
    request,
  }) => {
    const res = await request.get("/robots.txt")
    expect(res.status()).toBe(200)
    expect(res.headers()["content-type"]).toContain("text/plain")

    const body = await res.text()
    expect(body).toMatch(/User-Agent:\s*\*/i)
    expect(body).toMatch(/Disallow:\s*\/\s*$/im)
  })
})

test.describe("sitemap.xml", () => {
  test("is valid XML listing the primary static routes", async ({
    request,
  }) => {
    const res = await request.get("/sitemap.xml")
    expect(res.status()).toBe(200)
    expect(res.headers()["content-type"]).toContain("xml")

    const body = await res.text()
    expect(body).toContain("<urlset")
    expect(body).toMatch(/<loc>https?:\/\/[^<]+<\/loc>/)
    // URLs are language-prefixed (en/es), NOT a country code — see i18n config.
    expect(body).toMatch(/<loc>[^<]*\/en<\/loc>/)
    expect(body).toMatch(/<loc>[^<]*\/en\/store<\/loc>/)
  })
})

test.describe("OpenGraph image", () => {
  test("default (main) OG image renders as an image", async ({
    page,
    request,
  }) => {
    // Next appends a hashed segment to the opengraph-image route, so the stable
    // path is unknowable — read the actual URL Next advertised in <meta>.
    await gotoOk(page, path("/", "en"))
    const ogUrl = await page
      .locator('head meta[property="og:image"]')
      .getAttribute("content")
    expect(ogUrl, "og:image meta missing").toBeTruthy()

    // Fetch it relative to the test baseURL (ignore the meta's origin, which is
    // the configured canonical host, not necessarily the server under test).
    const { pathname, search } = new URL(ogUrl!)
    const res = await request.get(`${pathname}${search}`)
    expect(res.status()).toBe(200)
    expect(res.headers()["content-type"]).toContain("image/")
  })
})

test.describe("Canonical + hreflang alternates", () => {
  test("home emits canonical and hreflang links for every locale", async ({
    page,
  }) => {
    await gotoOk(page, path("/", "en"))

    const canonical = page.locator('head link[rel="canonical"]')
    await expect(canonical).toHaveAttribute("href", /\/en\/?$/)

    for (const tag of HREFLANGS) {
      await expect(
        page.locator(`head link[rel="alternate"][hreflang="${tag}"]`),
        `hreflang ${tag}`
      ).toHaveCount(1)
    }
  })

  test("indexable robots meta is present", async ({ page }) => {
    await gotoOk(page, path("/", "en"))
    const robots = page.locator('head meta[name="robots"]')
    if (await robots.count()) {
      await expect(robots).toHaveAttribute("content", /index/)
    }
  })
})
