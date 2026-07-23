import { describe, it, expect } from "vitest"
import { validateStorefrontEnv } from "@lib/env"

/**
 * Unit tests for the storefront boot env validation (roadmap tasks 59 + 74).
 * Exercises the lenient-dev / strict-prod rules and the named-variable errors.
 */

const base = {
  NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY: "pk_test_abc",
}

describe("validateStorefrontEnv", () => {
  it("accepts a minimal valid dev env", () => {
    const env = validateStorefrontEnv({ ...base, NODE_ENV: "development" })
    expect(env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY).toBe("pk_test_abc")
    expect(env.NODE_ENV).toBe("development")
  })

  it("defaults NODE_ENV to development when absent", () => {
    const env = validateStorefrontEnv({ ...base })
    expect(env.NODE_ENV).toBe("development")
  })

  it("rejects a missing publishable key, naming it", () => {
    expect(() => validateStorefrontEnv({ NODE_ENV: "development" })).toThrow(
      /NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY/
    )
  })

  it("rejects a publishable key without the pk_ prefix", () => {
    expect(() =>
      validateStorefrontEnv({
        ...base,
        NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY: "xx",
      })
    ).toThrow(/pk_/)
  })

  it("requires PREVIEW_CODE when the wall is on", () => {
    expect(() =>
      validateStorefrontEnv({ ...base, COMING_SOON: "true" })
    ).toThrow(/PREVIEW_CODE/)
  })

  it("accepts a 6-digit PREVIEW_CODE with the wall on", () => {
    const env = validateStorefrontEnv({
      ...base,
      COMING_SOON: "true",
      PREVIEW_CODE: "900800",
    })
    expect(env.PREVIEW_CODE).toBe("900800")
  })

  it("rejects a non-6-digit PREVIEW_CODE", () => {
    expect(() =>
      validateStorefrontEnv({
        ...base,
        COMING_SOON: "true",
        PREVIEW_CODE: "12",
      })
    ).toThrow(/6-digit/)
  })

  it("in production requires an https base URL", () => {
    expect(() =>
      validateStorefrontEnv({
        ...base,
        NODE_ENV: "production",
        NEXT_PUBLIC_BASE_URL: "http://insecure.example",
        REVALIDATE_SECRET: "a-strong-secret",
      })
    ).toThrow(/must be https in production/)
  })

  it("in production rejects the placeholder revalidate secret", () => {
    expect(() =>
      validateStorefrontEnv({
        ...base,
        NODE_ENV: "production",
        NEXT_PUBLIC_BASE_URL: "https://saludlinkusa.com",
        REVALIDATE_SECRET: "supersecret",
      })
    ).toThrow(/REVALIDATE_SECRET/)
  })

  it("accepts a valid production env", () => {
    const env = validateStorefrontEnv({
      ...base,
      NODE_ENV: "production",
      NEXT_PUBLIC_BASE_URL: "https://saludlinkusa.com",
      REVALIDATE_SECRET: "a-strong-unique-secret",
      COMING_SOON: "true",
      PREVIEW_CODE: "900800",
    })
    expect(env.NEXT_PUBLIC_BASE_URL).toBe("https://saludlinkusa.com")
  })

  it("rejects a bad default region format", () => {
    expect(() =>
      validateStorefrontEnv({ ...base, NEXT_PUBLIC_DEFAULT_REGION: "USA" })
    ).toThrow(/NEXT_PUBLIC_DEFAULT_REGION/)
  })
})
