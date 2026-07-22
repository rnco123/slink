import { describe, it, expect } from "vitest"
import {
  validateNoPhi,
  assertNoPhi,
  isPhiFree,
  PhiDetectedError,
} from "../validate-no-phi"

describe("validateNoPhi — allowed commerce payloads", () => {
  it("passes a realistic order payload", () => {
    const order = {
      customer_id: "cus_123",
      email: "shopper@example.com",
      phone: "+1 555 123 4567",
      shipping_address: {
        first_name: "Alex",
        last_name: "Rivera",
        address_1: "1 Market St",
        city: "Austin",
        province: "TX",
        postal_code: "78701",
        country_code: "US",
      },
      items: [
        { product_id: "prod_1", variant_id: "var_1", quantity: 2 },
        { product_id: "prod_2", variant_id: "var_2", quantity: 1 },
      ],
      payment_status: "captured",
      coupon: "WELCOME10",
      locale: "en",
      marketing_preferences: { newsletter: true },
    }
    expect(validateNoPhi(order).ok).toBe(true)
    expect(isPhiFree(order)).toBe(true)
  })

  it("does not flag commerce keys that merely contain safe substrings", () => {
    const payload = {
      paymentProvider: "stripe",
      allergens: "contains soy", // product allergen info, not patient allergies
      medicalDeviceCategory: "otc",
      serviceProvider: "ups",
    }
    expect(validateNoPhi(payload).ok).toBe(true)
  })
})

describe("validateNoPhi — nested PHI detection", () => {
  it("detects a prohibited key nested deep in the tree", () => {
    const r = validateNoPhi({
      email: "a@b.com",
      visit: { notes: { diagnosis: "hypertension" } },
    })
    expect(r.ok).toBe(false)
    expect(r.violations.map((v) => v.path)).toContain("visit.notes.diagnosis")
  })

  it("detects PHI inside arrays with indexed paths", () => {
    const r = validateNoPhi({
      items: [{ product_id: "p1" }, { symptoms: "cough" }],
    })
    expect(r.ok).toBe(false)
    expect(r.violations[0]?.path).toBe("items.1.symptoms")
  })

  it.each([
    "diagnosis",
    "symptoms",
    "medications",
    "prescription",
    "patient_id",
    "patientId",
    "emr_id",
    "encounter_id",
    "provider_id",
    "medical_history",
    "allergies",
    "lab_results",
    "appointment_reason",
    "insurance_info",
    "soap_note",
    "treatment_plan",
  ])("rejects prohibited key %s in any casing/separator", (key) => {
    const r = validateNoPhi({ [key]: "value" })
    expect(r.ok).toBe(false)
  })

  it("never includes the offending value in a violation", () => {
    const secretValue = "patient has terminal illness"
    const r = validateNoPhi({ diagnosis: secretValue })
    const serialized = JSON.stringify(r.violations)
    expect(serialized).not.toContain(secretValue)
    expect(serialized).not.toContain("terminal")
  })

  it("does not recurse into a prohibited subtree", () => {
    const r = validateNoPhi({
      medical_history: { symptoms: "x", medications: "y" },
    })
    // Only the top prohibited branch is reported, not each child.
    expect(r.violations).toHaveLength(1)
    expect(r.violations[0]?.path).toBe("medical_history")
  })
})

describe("validateNoPhi — free-text scanning", () => {
  it("does NOT scan values by default (structural keys only)", () => {
    const r = validateNoPhi({ message: "I was diagnosed with the flu" })
    expect(r.ok).toBe(true)
  })

  it("scans designated text paths when asked", () => {
    const r = validateNoPhi(
      { message: "I was diagnosed with the flu" },
      { scanTextPaths: ["message"] }
    )
    expect(r.ok).toBe(false)
    expect(r.violations[0]?.reason).toBe("clinical-free-text")
  })

  it("does not block legitimate product-search phrases even when scanning all text", () => {
    for (const q of ["Blood Pressure Monitor", "Vitamin D", "Glucose Monitor"]) {
      const r = validateNoPhi({ note: q }, { scanAllText: true })
      expect(r.ok, `"${q}" should be allowed`).toBe(true)
    }
  })
})

describe("assertNoPhi", () => {
  it("throws PhiDetectedError with value-free violations", () => {
    try {
      assertNoPhi({ prescription: "amoxicillin 500mg" })
      throw new Error("should have thrown")
    } catch (e) {
      expect(e).toBeInstanceOf(PhiDetectedError)
      const err = e as PhiDetectedError
      expect(err.violations[0]?.path).toBe("prescription")
      expect(err.message).not.toContain("amoxicillin")
    }
  })

  it("does not throw for clean input", () => {
    expect(() => assertNoPhi({ order_id: "o1", locale: "en" })).not.toThrow()
  })
})
