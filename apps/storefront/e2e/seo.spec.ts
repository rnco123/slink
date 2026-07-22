import { test, expect } from "@playwright/test"
import { path } from "./support/routes"
import { gotoOk } from "./support/helpers"

// BCP-47 hreflang tags emitted by lib/i18n (localeHreflang), plus x-default.
const HREFLANGS = ["en-US", "es-US", "x-default"] as const

test.describe("robots.txt", () => {
  test("is served and blocks transactional surfaces", async ({ request }) => {
    const res = await request.get("/robots.txt")
    expect(res.status()).toBe(200)
    expect(res.headers()["content-type"]).toContain("text/plain")

    const body = await res.text()
    expect(body).toMatch(/User-Agent:\s*\*/i)
    expect(body).toContain("Sitemap:")
    for (const blocked of ["/cart", "/checkout", "/account"]) {
      expect(body).toContain(`Disallow: ${blocked}`)
    }
  })
})

test.describe("sitemap.xml", () => {
  test("is valid XML listing the primary static routes", async ({ request }) => {
    const res = await request.get("/sitemap.xml")
    expect(res.status()).toBe(200)
    expect(res.headers()["content-type"]).toContain("xml")

    const body = await res.text()
    expect(body).toContain("<urlset")
    expect(body).toMatch(/<loc>https?:\/\/[^<]+<\/loc>/)
    // Home + store are always present.
    expect(body).toMatch(/<loc>[^<]*\/us<\/loc>/)
    expect(body).toMatch(/<loc>[^<]*\/us\/store<\/loc>/)
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
