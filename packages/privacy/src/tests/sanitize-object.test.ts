import { describe, it, expect } from "vitest"
import {
  sanitizeObject,
  buildSafeMetadata,
  buildSafeCognitoAttributes,
} from "../sanitize-object"
import { PhiDetectedError } from "../validate-no-phi"

describe("sanitizeObject", () => {
  it("keeps only allowlisted keys and drops unknown ones", () => {
    const out = sanitizeObject(
      { locale: "en", giftOrder: true, evilTracking: "x", note: "y" },
      ["locale", "giftOrder"]
    )
    expect(out).toEqual({ locale: "en", giftOrder: true })
  })

  it("matches keys regardless of casing/separators", () => {
    const out = sanitizeObject({ postal_code: "78701" }, ["postalCode"])
    expect(out).toEqual({ postal_code: "78701" })
  })

  it("drops a prohibited key even if it is mistakenly allowlisted", () => {
    // shouldAssert defaults true, but the prohibited key is dropped before the
    // assertion, so the result is clean and no throw occurs.
    const out = sanitizeObject({ diagnosis: "flu", locale: "en" }, [
      "diagnosis",
      "locale",
    ])
    expect(out).toEqual({ locale: "en" })
  })

  it("supports deep sanitization of nested objects and arrays", () => {
    const out = sanitizeObject(
      {
        locale: "en",
        nested: { locale: "es", secretKey: "x" },
        list: [{ locale: "fr", drop: 1 }],
      },
      ["locale", "nested", "list"],
      { deep: true }
    )
    expect(out).toEqual({
      locale: "en",
      nested: { locale: "es" },
      list: [{ locale: "fr" }],
    })
  })

  it("returns an empty object for non-object input", () => {
    expect(sanitizeObject(null, ["a"])).toEqual({})
    expect(sanitizeObject("string", ["a"])).toEqual({})
    expect(sanitizeObject(42, ["a"])).toEqual({})
  })
})

describe("buildSafeMetadata", () => {
  it("filters browser-supplied metadata to the safe allowlist", () => {
    const browserMetadata = {
      locale: "en",
      marketing_source: "google",
      gift_order: true,
      diagnosis: "should never pass",
      internal_admin_flag: true,
    }
    const meta = buildSafeMetadata(browserMetadata)
    expect(meta).toEqual({
      locale: "en",
      marketing_source: "google",
      gift_order: true,
    })
  })

  it("accepts extra per-call allowlisted keys", () => {
    const meta = buildSafeMetadata({ subscription_interval: "monthly" }, [
      "subscription_interval",
    ])
    expect(meta).toEqual({ subscription_interval: "monthly" })
  })
})

describe("buildSafeCognitoAttributes", () => {
  it("keeps identity attributes and drops clinical/custom ones", () => {
    const attrs = buildSafeCognitoAttributes({
      email: "a@b.com",
      given_name: "Alex",
      "custom:patient_id": "p1",
      "custom:diagnosis": "x",
      "custom:marketing_opt_in": "true",
    })
    expect(attrs).toEqual({
      email: "a@b.com",
      given_name: "Alex",
      "custom:marketing_opt_in": "true",
    })
  })
})

describe("sanitizeObject assertion", () => {
  it("can be trusted to always return PHI-free output", () => {
    // Even a hostile allowlist cannot leak PHI.
    expect(() =>
      sanitizeObject({ symptoms: "x" }, ["symptoms"], { assertNoPhi: true })
    ).not.toThrow()
    expect(sanitizeObject({ symptoms: "x" }, ["symptoms"])).toEqual({})
  })

  it("PhiDetectedError is exported for callers that opt into strict construction", () => {
    expect(PhiDetectedError).toBeTypeOf("function")
  })
})
