import { test, expect } from "@playwright/test"
import { path } from "./support/routes"

/**
 * Zero console errors on every page (roadmap task 76). Navigates the core
 * backend-free routes and asserts nothing logged a console ERROR and no uncaught
 * page error fired. Warnings are collected and attached for visibility but don't
 * fail the build (third-party libs emit benign warnings); console errors and
 * uncaught exceptions are real defects and DO fail.
 */
// Backend-FREE routes only (this spec runs in the default, no-backend lane).
// Legal pages are Medusa-content-driven → covered by the @commerce legal.spec.
const ROUTES = [
  "/",
  "/about",
  "/contact",
  "/conditions",
  "/telemedicine",
  "/licensing",
]

// Known-benign error substrings to ignore (network noise from optional
// integrations that are intentionally unconfigured in test, e.g. analytics).
const IGNORE = ["posthog", "/ingest", "favicon", "ERR_INTERNET_DISCONNECTED"]

for (const route of ROUTES) {
  test(`no console errors on ${route}`, async ({ page }, testInfo) => {
    const errors: string[] = []
    const warnings: string[] = []

    page.on("console", (msg) => {
      const text = msg.text()
      if (IGNORE.some((s) => text.toLowerCase().includes(s.toLowerCase()))) {
        return
      }
      if (msg.type() === "error") errors.push(text)
      else if (msg.type() === "warning") warnings.push(text)
    })
    page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`))

    await page.goto(path(route), { waitUntil: "networkidle" })

    if (warnings.length) {
      await testInfo.attach("console-warnings.txt", {
        body: warnings.join("\n"),
        contentType: "text/plain",
      })
    }

    expect(errors, `console errors on ${route}:\n${errors.join("\n")}`).toEqual(
      []
    )
  })
}
