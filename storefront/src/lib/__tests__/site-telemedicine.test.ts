import { describe, it, expect } from "vitest"
import { telemedicineUrl, type TelemedicinePlacement } from "@lib/config/site"

/**
 * Task 65 §3b — per-placement UTM tagging on the telehealth link-out. Locks in the
 * agreed convention (source=storefront, medium=cta, campaign=telehealth-linkout)
 * and that each placement carries its own utm_content so the portal can attribute
 * which CTA converts.
 */
const PLACEMENTS: TelemedicinePlacement[] = [
  "nav",
  "mobile-menu",
  "home-section",
  "telemedicine-page",
]

describe("telemedicineUrl", () => {
  it("points at the telehealth portal host", () => {
    const u = new URL(telemedicineUrl("nav"))
    expect(u.hostname).toBe("care.saludlinkusa.com")
  })

  it("applies the shared UTM convention", () => {
    const p = new URL(telemedicineUrl("home-section")).searchParams
    expect(p.get("utm_source")).toBe("storefront")
    expect(p.get("utm_medium")).toBe("cta")
    expect(p.get("utm_campaign")).toBe("telehealth-linkout")
  })

  it("tags each placement with its own utm_content", () => {
    for (const placement of PLACEMENTS) {
      const p = new URL(telemedicineUrl(placement)).searchParams
      expect(p.get("utm_content")).toBe(placement)
    }
  })

  it("produces a distinct URL per placement", () => {
    const urls = new Set(PLACEMENTS.map((p) => telemedicineUrl(p)))
    expect(urls.size).toBe(PLACEMENTS.length)
  })
})
