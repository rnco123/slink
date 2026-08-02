import { describe, it, expect } from "vitest"
import {
  bmi,
  idealBodyWeightLb,
  percentAboveIbw,
  highRiskFlags,
  SECTIONS,
} from "../intake-config"

const jane = { height_ft: "5", height_in: "4", current_weight: "200", sex_at_birth: "Female" }

describe("intake calculators", () => {
  it("computes BMI from US units", () => {
    // 703 * 200 / 64^2 = 34.33
    expect(bmi(jane)!).toBeCloseTo(34.3, 1)
  })

  it("computes Devine ideal body weight (female)", () => {
    // 45.5 + 2.3*4 = 54.7 kg -> ~120.6 lb
    expect(idealBodyWeightLb(jane)!).toBeCloseTo(120.6, 0)
  })

  it("computes percent above ideal body weight", () => {
    expect(percentAboveIbw(jane)!).toBeCloseTo(65.8, 0)
  })

  it("returns null when inputs are missing", () => {
    expect(bmi({})).toBeNull()
    expect(idealBodyWeightLb({ current_weight: "200" })).toBeNull()
  })
})

describe("high-risk STOP flags", () => {
  it("flags MEN2, MTC, allergy, and pregnancy", () => {
    expect(highRiskFlags({ men2: "Yes" })).toContain("MEN2 syndrome")
    expect(highRiskFlags({ mtc_personal: "Yes" })).toContain(
      "Personal history of Medullary Thyroid Cancer"
    )
    expect(highRiskFlags({ glp1_allergy: "Yes" })).toContain(
      "Allergy to GLP-1 medication"
    )
    expect(highRiskFlags({ pregnant: "Yes" })).toContain("Pregnancy")
  })

  it("returns no flags when nothing is high-risk", () => {
    expect(highRiskFlags({ men2: "No", pregnant: "No" })).toEqual([])
  })
})

describe("skip logic (prior GLP-1 medication history)", () => {
  const medName = SECTIONS.find((s) => s.id === "weight_history")!.fields.find(
    (f) => f.id === "med_name"
  )!

  it("hides medication history when no prior GLP-1 use", () => {
    expect(medName.showIf!({})).toBe(false)
    expect(
      medName.showIf!({
        used_rx_weightloss: "No",
        used_semaglutide: "No",
        used_tirzepatide: "No",
      })
    ).toBe(false)
  })

  it("shows medication history when any prior GLP-1 use", () => {
    expect(medName.showIf!({ used_semaglutide: "Yes" })).toBe(true)
    expect(medName.showIf!({ used_tirzepatide: "Yes" })).toBe(true)
    expect(medName.showIf!({ used_rx_weightloss: "Yes" })).toBe(true)
  })
})
