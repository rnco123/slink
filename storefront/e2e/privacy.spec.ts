import { test, expect, type Request } from "@playwright/test"
import { gotoOk } from "./support/helpers"

/**
 * PHI Boundary Firewall — end-to-end privacy guarantees.
 *
 * These specs assert the *observable* privacy behaviour of the running
 * storefront: what leaves the browser (analytics), what appears in URLs, and
 * that session replay stays off. They complement the unit tests in
 * `@saludlink/privacy`, which prove the firewall logic in isolation.
 *
 * Analytics is proxied through `/ingest` (see next.config.js). We intercept that
 * path to inspect exactly what would be sent to PostHog. With no
 * `NEXT_PUBLIC_POSTHOG_KEY` set locally, PostHog never initialises, so these
 * tests focus on the guarantees that hold regardless of analytics being live:
 * URLs, session-replay config, and that no free text is wired to egress.
 */

/** Clinical strings that must never leave the browser. */
const PHI_MARKERS = [
  "diagnosis",
  "symptom",
  "prescription",
  "my medication",
  "treatment plan",
]

function collectIngest(requests: Request[]) {
  return (req: Request) => {
    const url = req.url()
    if (url.includes("/ingest") || url.includes("posthog")) requests.push(req)
  }
}

test.describe("PHI boundary — analytics egress", () => {
  test("no analytics request body contains clinical free text", async ({
    page,
  }) => {
    const ingest: Request[] = []
    page.on("request", collectIngest(ingest))

    await gotoOk(page, "/en")
    // Exercise navigation that would emit pageview/product events.
    await page.waitForTimeout(500)

    for (const req of ingest) {
      const body = req.postData() ?? ""
      const haystack = `${req.url()} ${body}`.toLowerCase()
      for (const marker of PHI_MARKERS) {
        expect(haystack, `analytics leaked "${marker}"`).not.toContain(marker)
      }
    }
  })

  test("contact-form free text is never forwarded to analytics", async ({
    page,
  }) => {
    const ingest: Request[] = []
    page.on("request", collectIngest(ingest))

    const res = await page.goto("/en/contact", {
      waitUntil: "domcontentloaded",
    })
    // Contact page may not exist in every build; only assert when present.
    test.skip(!res || res.status() >= 400, "no contact page in this build")

    const message = page.locator(
      "textarea, [name='message'], [data-testid='contact-message']"
    )
    if (await message.count()) {
      await message
        .first()
        .fill("I have symptoms and need a prescription for my diagnosis.")
      await page.waitForTimeout(300)
    }

    for (const req of ingest) {
      const haystack = `${req.url()} ${req.postData() ?? ""}`.toLowerCase()
      for (const marker of PHI_MARKERS) {
        expect(haystack).not.toContain(marker)
      }
    }
  })
})

test.describe("PHI boundary — URLs", () => {
  test("no PHI tokens appear in the landing URL or its links", async ({
    page,
  }) => {
    await gotoOk(page, "/en")
    expect(page.url().toLowerCase()).not.toMatch(
      /patientid|diagnosis|symptom|treatment|prescription|medicalhistory/
    )

    const hrefs = await page
      .locator("a[href]")
      .evaluateAll((els) =>
        els.map((e) => (e as HTMLAnchorElement).getAttribute("href") ?? "")
      )
    for (const href of hrefs) {
      expect(href.toLowerCase(), `link exposes PHI token: ${href}`).not.toMatch(
        /patientid|diagnosis|symptom|treatment|prescription/
      )
    }
  })
})

test.describe("PHI boundary — session replay", () => {
  test("PostHog session recording is not enabled", async ({ page }) => {
    await gotoOk(page, "/en")
    // Either PostHog is absent (no key) or, if present, recording is disabled.
    const recordingActive = await page.evaluate(() => {
      const ph = (
        window as unknown as {
          posthog?: { sessionRecordingStarted?: () => boolean }
        }
      ).posthog
      if (!ph || typeof ph.sessionRecordingStarted !== "function") return false
      try {
        return ph.sessionRecordingStarted()
      } catch {
        return false
      }
    })
    expect(recordingActive).toBe(false)
  })
})
