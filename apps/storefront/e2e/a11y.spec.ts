import { test, expect } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"
import { path } from "./support/routes"
import { gotoOk } from "./support/helpers"

/**
 * Automated accessibility checks (roadmap task 58) with axe-core. Backend-free
 * marketing/legal routes so this runs in the default suite / CI.
 *
 * We gate on WCAG 2 A/AA and fail on `serious` + `critical` impact violations
 * (the actionable, high-signal tiers). `minor`/`moderate` are reported in the
 * attachment for follow-up but don't fail the build, keeping the gate stable.
 */
const ROUTES = [
  "/",
  "/about",
  "/contact",
  "/conditions",
  "/legal/privacy-policy",
]

const BLOCKING = new Set(["serious", "critical"])

for (const route of ROUTES) {
  test(`a11y: ${route} has no serious/critical violations`, async ({
    page,
  }, testInfo) => {
    await gotoOk(page, path(route))

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze()

    const blocking = results.violations.filter((v) =>
      BLOCKING.has(v.impact ?? "")
    )

    // Attach the full report (including non-blocking) for triage.
    await testInfo.attach("axe-violations.json", {
      body: JSON.stringify(results.violations, null, 2),
      contentType: "application/json",
    })

    const summary = blocking
      .map((v) => `${v.impact}: ${v.id} (${v.nodes.length}) — ${v.help}`)
      .join("\n")

    expect(blocking, `serious/critical a11y violations:\n${summary}`).toEqual(
      []
    )
  })
}
