/**
 * Telemedicine intake — form MODEL and pure frontend logic (no PHI leaves the
 * browser here). The wizard renders these sections; submission is a marked
 * integration point that must POST to a HIPAA-compliant backend (never the
 * commerce API). See intake-wizard.tsx.
 */

export type Answers = Record<string, unknown>

export type FieldType =
  | "text"
  | "email"
  | "tel"
  | "number"
  | "date"
  | "textarea"
  | "select"
  | "radio"
  | "checkboxes"
  | "yesno"
  | "heightUS" // feet + inches
  | "file"
  | "computed" // read-only derived value
  | "signature"

export type Field = {
  id: string
  label: string
  type: FieldType
  options?: string[]
  placeholder?: string
  help?: string
  optional?: boolean
  unit?: string
  /** Conditional display (skip logic). */
  showIf?: (a: Answers) => boolean
  /** Derived read-only value (BMI, IBW, % above IBW). */
  compute?: (a: Answers) => string
}

export type Section = {
  id: string
  title: string
  intro?: string
  fields: Field[]
}

// ---------------------------------------------------------------------------
// Pure calculators (US units: height in inches, weight in lb)
// ---------------------------------------------------------------------------

const num = (v: unknown): number | null => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""))
  return Number.isFinite(n) && n > 0 ? n : null
}

export const totalInches = (a: Answers): number | null => {
  const ft = num(a.height_ft)
  const inch =
    typeof a.height_in === "number"
      ? a.height_in
      : parseFloat(String(a.height_in ?? "0")) // inches can be 0
  if (ft === null) return null
  const i = Number.isFinite(inch) ? inch : 0
  return ft * 12 + i
}

export const bmi = (a: Answers): number | null => {
  const h = totalInches(a)
  const w = num(a.current_weight)
  if (!h || !w) return null
  return (703 * w) / (h * h)
}

/** Devine ideal body weight (lb). Requires biological sex + height. */
export const idealBodyWeightLb = (a: Answers): number | null => {
  const h = totalInches(a)
  if (!h) return null
  const overFive = Math.max(0, h - 60)
  const sex = String(a.sex_at_birth ?? "").toLowerCase()
  // Devine: male 50kg + 2.3kg/in over 5ft; female 45.5kg + 2.3kg/in over 5ft.
  const baseKg = sex.startsWith("f") ? 45.5 : 50
  const kg = baseKg + 2.3 * overFive
  return kg * 2.2046
}

export const percentAboveIbw = (a: Answers): number | null => {
  const w = num(a.current_weight)
  const ibw = idealBodyWeightLb(a)
  if (!w || !ibw) return null
  return ((w - ibw) / ibw) * 100
}

// ---------------------------------------------------------------------------
// Absolute high-risk STOP flags → provider review required before scheduling
// ---------------------------------------------------------------------------

export const highRiskFlags = (a: Answers): string[] => {
  const flags: string[] = []
  const isYes = (id: string) => String(a[id] ?? "") === "Yes"
  if (isYes("mtc_personal"))
    flags.push("Personal history of Medullary Thyroid Cancer")
  if (isYes("mtc_family"))
    flags.push("Family history of Medullary Thyroid Cancer")
  if (isYes("men2")) flags.push("MEN2 syndrome")
  if (isYes("glp1_allergy")) flags.push("Allergy to GLP-1 medication")
  if (String(a.pregnant ?? "") === "Yes") flags.push("Pregnancy")
  return flags
}

// ---------------------------------------------------------------------------
// The 12 sections
// ---------------------------------------------------------------------------

const usedGlp1 = (a: Answers) =>
  a.used_rx_weightloss === "Yes" ||
  a.used_semaglutide === "Yes" ||
  a.used_tirzepatide === "Yes"

export const SECTIONS: Section[] = [
  {
    id: "identity",
    title: "Patient identity",
    fields: [
      { id: "first_name", label: "Legal first name", type: "text" },
      { id: "last_name", label: "Legal last name", type: "text" },
      { id: "dob", label: "Date of birth", type: "date" },
      {
        id: "sex_at_birth",
        label: "Biological sex assigned at birth",
        type: "radio",
        options: ["Female", "Male"],
      },
      {
        id: "gender_identity",
        label: "Current gender identity",
        type: "text",
        optional: true,
      },
      { id: "height", label: "Height", type: "heightUS" },
      {
        id: "current_weight",
        label: "Current weight",
        type: "number",
        unit: "lb",
      },
      {
        id: "bmi",
        label: "BMI",
        type: "computed",
        compute: (a) => {
          const v = bmi(a)
          return v ? v.toFixed(1) : "—"
        },
      },
      {
        id: "ibw",
        label: "Ideal body weight",
        type: "computed",
        compute: (a) => {
          const v = idealBodyWeightLb(a)
          return v ? `${Math.round(v)} lb` : "—"
        },
      },
      {
        id: "pct_above_ibw",
        label: "Percent above ideal body weight",
        type: "computed",
        compute: (a) => {
          const v = percentAboveIbw(a)
          return v === null ? "—" : `${v > 0 ? "+" : ""}${v.toFixed(0)}%`
        },
      },
    ],
  },
  {
    id: "contact",
    title: "Contact & telemedicine eligibility",
    fields: [
      { id: "phone", label: "Phone number", type: "tel" },
      { id: "email", label: "Email", type: "email" },
      { id: "home_address", label: "Home address", type: "textarea" },
      {
        id: "state_today",
        label: "State where you are physically located today",
        type: "select",
        options: US_STATES(),
      },
      {
        id: "pharmacy",
        label: "Preferred pharmacy",
        type: "text",
        optional: true,
      },
      {
        id: "gov_id",
        label: "Upload driver’s license or government ID",
        type: "file",
        help: "Uploaded securely to the telehealth platform — not stored by the store.",
      },
    ],
  },
  {
    id: "weight_history",
    title: "Weight history",
    fields: [
      {
        id: "goal_weight",
        label: "What is your goal weight?",
        type: "number",
        unit: "lb",
      },
      {
        id: "highest_weight",
        label: "Highest weight you’ve ever reached?",
        type: "number",
        unit: "lb",
      },
      {
        id: "lowest_adult_weight",
        label: "Lowest adult weight you’ve maintained?",
        type: "number",
        unit: "lb",
      },
      {
        id: "age_gain_began",
        label: "At what age did you begin gaining weight?",
        type: "number",
        unit: "yrs",
      },
      {
        id: "years_struggled",
        label: "Approximately how many years have you struggled with weight?",
        type: "number",
        unit: "yrs",
      },
      {
        id: "prior_supervised_program",
        label: "Previously participated in a supervised weight-loss program?",
        type: "yesno",
      },
      {
        id: "worked_with_dietitian",
        label: "Have you worked with a dietitian?",
        type: "yesno",
      },
      {
        id: "used_rx_weightloss",
        label: "Previously used prescription weight-loss medication?",
        type: "yesno",
      },
      {
        id: "used_semaglutide",
        label: "Previously taken Semaglutide?",
        type: "yesno",
      },
      {
        id: "used_tirzepatide",
        label: "Previously taken Tirzepatide?",
        type: "yesno",
      },
      // Skip logic: only if any prior GLP-1 / Rx weight-loss use
      {
        id: "med_name",
        label: "Medication name",
        type: "text",
        showIf: usedGlp1,
      },
      {
        id: "med_starting_dose",
        label: "Starting dose",
        type: "text",
        showIf: usedGlp1,
      },
      {
        id: "med_highest_dose",
        label: "Highest dose",
        type: "text",
        showIf: usedGlp1,
      },
      { id: "med_duration", label: "Duration", type: "text", showIf: usedGlp1 },
      {
        id: "med_side_effects",
        label: "Side effects",
        type: "textarea",
        showIf: usedGlp1,
        optional: true,
      },
      {
        id: "med_reason_discontinued",
        label: "Reason discontinued",
        type: "textarea",
        showIf: usedGlp1,
        optional: true,
      },
      {
        id: "med_max_weight_lost",
        label: "Maximum weight lost",
        type: "number",
        unit: "lb",
        showIf: usedGlp1,
        optional: true,
      },
    ],
  },
  {
    id: "conditions",
    title: "Medical conditions",
    intro: "Check all that apply.",
    fields: [
      {
        id: "conditions",
        label: "Do you have any of the following?",
        type: "checkboxes",
        optional: true,
        options: [
          "High blood pressure",
          "High cholesterol",
          "Prediabetes",
          "Type 2 Diabetes",
          "Sleep apnea",
          "Fatty liver disease",
          "PCOS",
          "Heart disease",
          "Stroke",
          "Congestive heart failure",
          "Kidney disease",
          "Liver disease",
          "GERD",
          "Arthritis",
          "Asthma",
          "Depression",
          "Anxiety",
          "Hypothyroidism",
        ],
      },
    ],
  },
  {
    id: "contraindications",
    title: "Absolute contraindications",
    intro: "These help us keep you safe. Answer each honestly.",
    fields: [
      {
        id: "mtc_personal",
        label: "Personal history of Medullary Thyroid Cancer",
        type: "yesno",
      },
      {
        id: "mtc_family",
        label: "Family history of Medullary Thyroid Cancer",
        type: "yesno",
      },
      { id: "men2", label: "MEN2 syndrome", type: "yesno" },
      { id: "pancreatitis", label: "History of pancreatitis", type: "yesno" },
      { id: "gastroparesis", label: "Gastroparesis", type: "yesno" },
      {
        id: "severe_nausea",
        label: "Chronic severe nausea/vomiting",
        type: "yesno",
      },
      { id: "gallstones", label: "Gallstones", type: "yesno" },
      {
        id: "gallbladder_removed",
        label: "Gallbladder removal",
        type: "yesno",
      },
      { id: "severe_kidney", label: "Severe kidney disease", type: "yesno" },
      { id: "dialysis", label: "Dialysis", type: "yesno" },
      { id: "type1_diabetes", label: "Type 1 Diabetes", type: "yesno" },
      {
        id: "glp1_allergy",
        label: "Allergy to GLP-1 medication",
        type: "yesno",
      },
    ],
  },
  {
    id: "womens_health",
    title: "Women’s health",
    intro: "Please answer if applicable.",
    fields: [
      { id: "pregnant", label: "Are you pregnant?", type: "yesno" },
      { id: "planning_pregnancy", label: "Planning pregnancy?", type: "yesno" },
      { id: "breastfeeding", label: "Breastfeeding?", type: "yesno" },
      {
        id: "last_menstrual",
        label: "Last menstrual period",
        type: "date",
        optional: true,
      },
      {
        id: "birth_control",
        label: "Birth control method",
        type: "text",
        optional: true,
      },
      {
        id: "gestational_diabetes",
        label: "History of gestational diabetes",
        type: "yesno",
      },
    ],
  },
  {
    id: "medications",
    title: "Current medications",
    fields: [
      {
        id: "rx_medications",
        label: "Prescription medications",
        type: "textarea",
        optional: true,
        placeholder: "List names and doses, or “none”",
      },
      { id: "vitamins", label: "Vitamins", type: "textarea", optional: true },
      {
        id: "supplements",
        label: "Supplements",
        type: "textarea",
        optional: true,
      },
      {
        id: "drug_allergies",
        label: "Drug allergies",
        type: "textarea",
        optional: true,
        placeholder: "List allergies, or “none”",
      },
    ],
  },
  {
    id: "lifestyle",
    title: "Lifestyle",
    fields: [
      {
        id: "exercise_frequency",
        label: "Exercise frequency",
        type: "select",
        options: ["None", "1–2×/week", "3–4×/week", "5+×/week"],
      },
      {
        id: "daily_steps",
        label: "Average daily steps",
        type: "select",
        options: ["< 3,000", "3,000–6,000", "6,000–10,000", "10,000+"],
      },
      { id: "occupation", label: "Occupation", type: "text", optional: true },
      {
        id: "sleep_hours",
        label: "Hours of sleep",
        type: "select",
        options: ["< 5", "5–6", "7–8", "9+"],
      },
      {
        id: "water_intake",
        label: "Water intake",
        type: "select",
        options: ["< 4 cups", "4–8 cups", "8+ cups"],
      },
      {
        id: "alcohol_use",
        label: "Alcohol use",
        type: "select",
        options: ["None", "Occasional", "Weekly", "Daily"],
      },
      {
        id: "smoking",
        label: "Smoking",
        type: "select",
        options: ["Never", "Former", "Current"],
      },
      {
        id: "recreational_drugs",
        label: "Recreational drug use",
        type: "yesno",
      },
      {
        id: "meals_daily",
        label: "Number of meals daily",
        type: "select",
        options: ["1", "2", "3", "4+"],
      },
      {
        id: "sugary_drinks",
        label: "Sugary drinks per week",
        type: "select",
        options: ["0", "1–3", "4–7", "8+"],
      },
    ],
  },
  {
    id: "eating",
    title: "Eating behaviors",
    fields: [
      { id: "emotional_eating", label: "Emotional eating", type: "yesno" },
      { id: "night_eating", label: "Night eating", type: "yesno" },
      { id: "binge_eating", label: "Binge eating", type: "yesno" },
      { id: "constant_hunger", label: "Constant hunger", type: "yesno" },
      { id: "food_cravings", label: "Food cravings", type: "yesno" },
      {
        id: "fast_food",
        label: "Fast food frequency",
        type: "select",
        options: ["Rarely", "Weekly", "Several times/week", "Daily"],
      },
      {
        id: "largest_meal",
        label: "Largest meal",
        type: "select",
        options: ["Breakfast", "Lunch", "Dinner", "Late night"],
      },
      {
        id: "late_night_snacking",
        label: "Late-night snacking",
        type: "yesno",
      },
    ],
  },
  {
    id: "symptoms",
    title: "Symptoms",
    intro: "Check all that apply.",
    fields: [
      {
        id: "symptoms",
        label: "Are you experiencing any of the following?",
        type: "checkboxes",
        optional: true,
        options: [
          "Fatigue",
          "Joint pain",
          "Shortness of breath",
          "Snoring",
          "Daytime sleepiness",
          "Leg swelling",
          "Acid reflux",
          "Constipation",
          "Diarrhea",
          "Abdominal pain",
        ],
      },
    ],
  },
  {
    id: "goals",
    title: "Treatment goals",
    intro: "Check all that apply.",
    fields: [
      {
        id: "goals",
        label: "What would you like to achieve?",
        type: "checkboxes",
        optional: true,
        options: [
          "Lose weight",
          "Improve diabetes",
          "Improve blood pressure",
          "Improve mobility",
          "Improve energy",
        ],
      },
    ],
  },
  {
    id: "consent",
    title: "Consent & signature",
    intro:
      "Please review and acknowledge each item. Full terms are on our legal pages.",
    fields: [
      {
        id: "consent_telemedicine",
        label: "I have read and agree to the Telemedicine Consent.",
        type: "yesno",
      },
      {
        id: "consent_hipaa",
        label: "I acknowledge the HIPAA Notice of Privacy Practices.",
        type: "yesno",
      },
      {
        id: "consent_financial",
        label: "I accept financial responsibility for services.",
        type: "yesno",
      },
      {
        id: "consent_med_risks",
        label: "I acknowledge the risks of GLP-1 / weight-loss medication.",
        type: "yesno",
      },
      {
        id: "signature",
        label: "Electronic signature (type your full legal name)",
        type: "signature",
      },
      {
        id: "signed_date",
        label: "Date signed",
        type: "computed",
        compute: () => new Date().toLocaleDateString(),
      },
    ],
  },
]

// Minimal US state list for the eligibility dropdown.
function US_STATES(): string[] {
  return [
    "AL",
    "AK",
    "AZ",
    "AR",
    "CA",
    "CO",
    "CT",
    "DE",
    "FL",
    "GA",
    "HI",
    "ID",
    "IL",
    "IN",
    "IA",
    "KS",
    "KY",
    "LA",
    "ME",
    "MD",
    "MA",
    "MI",
    "MN",
    "MS",
    "MO",
    "MT",
    "NE",
    "NV",
    "NH",
    "NJ",
    "NM",
    "NY",
    "NC",
    "ND",
    "OH",
    "OK",
    "OR",
    "PA",
    "RI",
    "SC",
    "SD",
    "TN",
    "TX",
    "UT",
    "VT",
    "VA",
    "WA",
    "WV",
    "WI",
    "WY",
    "DC",
  ]
}
