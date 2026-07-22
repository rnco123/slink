import { describe, it, expect } from "vitest"
import { inspectUrl, isUrlSafe, assertUrlSafe } from "../middleware"

describe("inspectUrl", () => {
  it("accepts legitimate commerce URLs", () => {
    expect(isUrlSafe("/us/products/blood-pressure-monitor")).toBe(true)
    expect(isUrlSafe("/store/search?q=glucose+monitor&page=2")).toBe(true)
    expect(isUrlSafe("https://saludlinkusa.com/en/cart")).toBe(true)
  })

  it("rejects PHI in a query key", () => {
    const v = inspectUrl("/api/x?diagnosis=flu")
    expect(v.some((x) => x.location === "query-key")).toBe(true)
    expect(isUrlSafe("/api/x?diagnosis=flu")).toBe(false)
  })

  it("rejects PHI in the path", () => {
    expect(isUrlSafe("/portal/patientId/12345")).toBe(false)
    expect(isUrlSafe("/records/medical-history")).toBe(false)
  })

  it("rejects clinical narrative smuggled into a query value", () => {
    expect(isUrlSafe("/contact?note=I%20was%20diagnosed%20with%20flu")).toBe(
      false
    )
  })

  it("does not flag a benign query value", () => {
    expect(isUrlSafe("/search?q=vitamin+d")).toBe(true)
  })
})

describe("assertUrlSafe", () => {
  it("throws for PHI-bearing URLs and mentions SSO tokens", () => {
    expect(() => assertUrlSafe("/sso?patientId=1&diagnosis=x")).toThrow(
      /SSO token/i
    )
  })
  it("does not throw for safe URLs", () => {
    expect(() => assertUrlSafe("/en/products/vitamin-d")).not.toThrow()
  })
})
