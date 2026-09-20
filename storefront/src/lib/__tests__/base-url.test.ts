import { describe, it, expect, afterEach } from "vitest"
import { getBaseURL } from "@lib/util/env"

/**
 * Unit tests for getBaseURL (roadmap tasks 59 + 56). Guards the rule that a
 * missing NEXT_PUBLIC_BASE_URL never leaks localhost into production.
 */
const ORIGINAL = { ...process.env }

afterEach(() => {
  process.env = { ...ORIGINAL }
})

describe("getBaseURL", () => {
  it("uses NEXT_PUBLIC_BASE_URL when set", () => {
    process.env.NEXT_PUBLIC_BASE_URL = "https://example.test"
    expect(getBaseURL()).toBe("https://example.test")
  })

  it("trims whitespace around the configured URL", () => {
    process.env.NEXT_PUBLIC_BASE_URL = "  https://example.test  "
    expect(getBaseURL()).toBe("https://example.test")
  })

  it("falls back to the production origin in production (never localhost)", () => {
    delete process.env.NEXT_PUBLIC_BASE_URL
    ;(process.env as Record<string, string>).NODE_ENV = "production"
    const url = getBaseURL()
    expect(url).toBe("https://saludlinkusa.com")
    expect(url).not.toContain("localhost")
  })

  it("falls back to localhost only in development", () => {
    delete process.env.NEXT_PUBLIC_BASE_URL
    ;(process.env as Record<string, string>).NODE_ENV = "development"
    expect(getBaseURL()).toBe("http://localhost:8000")
  })
})
