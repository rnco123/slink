/**
 * The vocabulary of the PHI Boundary Firewall.
 *
 * This module defines *what* counts as Protected Health Information (PHI), what
 * counts as an allowed commerce field, and what counts as a secret that must be
 * redacted. It contains only data + pure matching helpers — no side effects — so
 * it is safe to import from edge middleware, Node servers, and the browser.
 *
 * Matching philosophy
 * -------------------
 * Keys are matched, not values, for structural PHI detection. A key is
 * normalized (lower-cased, stripped of separators) and tested against:
 *   1. {@link PROHIBITED_EXACT_KEYS}   — exact normalized-key matches, and
 *   2. {@link PROHIBITED_KEY_TOKENS}   — substrings that are unambiguously clinical.
 *
 * Tokens are deliberately conservative to avoid false positives on legitimate
 * commerce keys (e.g. `paymentProvider`, `allergens`, `medicalDevice` category).
 * Free-text *values* are only scanned when a schema opts a field in via
 * {@link CLINICAL_TEXT_PATTERNS}; product search queries are never scanned.
 *
 * @packageDocumentation
 */

/**
 * Normalize a field key for matching: lower-case and drop every character that
 * is not a letter or digit. This collapses `patient_id`, `patientId`,
 * `patient-id`, and `"patient id"` all to `patientid`.
 *
 * @param key - The raw object key.
 * @returns The normalized key.
 */
export function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, "")
}

/**
 * Exact normalized keys that are always PHI. These are matched by equality so
 * they cannot collide with longer commerce keys that merely contain them.
 *
 * `provider` lives here (not in the substring list) so `paymentProvider` and
 * `shippingProvider` remain valid commerce keys.
 */
export const PROHIBITED_EXACT_KEYS: ReadonlySet<string> = new Set([
  "diagnosis",
  "diagnoses",
  "symptom",
  "symptoms",
  "medication",
  "medications",
  "prescription",
  "prescriptions",
  "allergy",
  "allergies",
  "provider",
  "providerid",
  "patient",
  "patientid",
  "emr",
  "emrid",
  "encounter",
  "encounterid",
  "insurance",
  "insuranceid",
  "insuranceinfo",
  "phi",
  "icd",
  "icd9",
  "icd10",
  "cpt",
  "ndc",
  "hcpcs",
  "vitals",
  "immunization",
  "immunizations",
  "diagnosiscode",
])

/**
 * Substrings that are unambiguously clinical. If a normalized key *contains* any
 * of these, the field is treated as PHI. Chosen so they do not appear inside
 * common commerce keys.
 */
export const PROHIBITED_KEY_TOKENS: readonly string[] = [
  "diagnos", // diagnosis, diagnosed, diagnostic (clinical context)
  "symptom",
  "prescription",
  "medicationlist",
  "soapnote",
  "providernote",
  "providernotes",
  "chartnote",
  "progressnote",
  "visitnote",
  "clinicalnote",
  "treatmentplan",
  "treatmenthistory",
  "labresult",
  "labreport",
  "medicalhistory",
  "medicalrecord",
  "appointmentreason",
  "reasonforvisit",
  "chiefcomplaint",
  "patientid",
  "patientname",
  "encounterid",
  "emrid",
  "clinicaldocument",
  "clinicalnote",
  "healthcondition",
  "bloodtype",
  "immunization",
  "insuranceinfo",
  "insurancepolicy",
  "policynumber",
  "memberid",
  "groupnumber",
  "protectedhealth",
]

/**
 * Keys whose *values* must be redacted before logging or analytics egress, even
 * though the field itself is a legitimate part of a request. These are secrets
 * and directly-identifying contact data — never PHI, but never for logs either.
 */
export const SENSITIVE_REDACT_KEYS: readonly string[] = [
  "authorization",
  "cookie",
  "setcookie",
  "token",
  "accesstoken",
  "refreshtoken",
  "idtoken",
  "sessiontoken",
  "apikey",
  "secret",
  "clientsecret",
  "webhooksecret",
  "password",
  "passwd",
  "pwd",
  "stripekey",
  "stripesecret",
  "cardnumber",
  "cvc",
  "cvv",
  "ssn",
  "email",
  "emailaddress",
  "phone",
  "phonenumber",
  "address",
  "address1",
  "address2",
  "streetaddress",
  "requestbody",
  "body",
]

/**
 * The allowlist of commerce fields the website legitimately handles. This is the
 * canonical answer to "what data is this site allowed to hold?" and is used both
 * as documentation and to build safe metadata allowlists.
 */
export const ALLOWED_COMMERCE_FIELDS: readonly string[] = [
  "customerid",
  "id",
  "firstname",
  "lastname",
  "name",
  "email",
  "phone",
  "company",
  "address1",
  "address2",
  "city",
  "province",
  "state",
  "postalcode",
  "zip",
  "countrycode",
  "country",
  "shippingaddress",
  "billingaddress",
  "cart",
  "cartid",
  "order",
  "orderid",
  "lineitems",
  "quantity",
  "variantid",
  "productid",
  "producthandle",
  "sku",
  "products",
  "paymentstatus",
  "paymentprovider",
  "coupon",
  "couponcode",
  "discountcode",
  "locale",
  "currencycode",
  "marketingsource",
  "marketingoptin",
  "marketingpreferences",
  "newsletter",
  "giftorder",
  "giftmessage",
]

/**
 * Case-insensitive patterns that indicate a *free-text value* is describing
 * clinical/medical information (a narrative), as opposed to a product name.
 *
 * These are applied ONLY to fields a schema explicitly marks as PHI-scannable
 * (e.g. contact-form message, support description). They deliberately avoid
 * product/vital nouns like "blood pressure", "glucose", or "vitamin" so that
 * legitimate commerce searches and reviews are never blocked.
 */
export const CLINICAL_TEXT_PATTERNS: readonly RegExp[] = [
  /\bdiagnos(is|es|ed|e|tic)\b/i,
  /\bsymptoms?\b/i,
  /\bprescri(be|bed|bing|ption)\b/i,
  /\bmedications?\b/i,
  /\bdosages?\b/i,
  /\brefills?\b/i,
  /\bside\s?effects?\b/i,
  /\ballergic\s+to\b/i,
  /\btreatment\s+plan\b/i,
  /\blab\s+results?\b/i,
  /\bmedical\s+history\b/i,
  /\bmy\s+(doctor|physician|provider|condition|prescription|medication)\b/i,
  /\bappointment\s+(reason|for)\b/i,
  /\breason\s+for\s+(my\s+)?visit\b/i,
  /\bchief\s+complaint\b/i,
  /\bsoap\s+notes?\b/i,
  /\b(icd|cpt)[-\s]?\d/i,
]

/**
 * A structural PHI match against an object key.
 */
export interface KeyMatch {
  /** How the match was made. */
  readonly kind: "exact" | "token"
  /** The normalized keyword that matched. Never the field value. */
  readonly keyword: string
}

/**
 * Test whether an object key denotes PHI.
 *
 * @param rawKey - The un-normalized object key.
 * @returns A {@link KeyMatch} when the key is PHI, otherwise `null`.
 */
export function matchProhibitedKey(rawKey: string): KeyMatch | null {
  const key = normalizeKey(rawKey)
  if (!key) return null
  if (PROHIBITED_EXACT_KEYS.has(key)) {
    return { kind: "exact", keyword: key }
  }
  for (const token of PROHIBITED_KEY_TOKENS) {
    if (key.includes(token)) {
      return { kind: "token", keyword: token }
    }
  }
  return null
}

/**
 * Test whether a key should have its value redacted before egress (logs/analytics).
 *
 * @param rawKey - The un-normalized object key.
 * @returns `true` when the value is sensitive (secret or directly identifying).
 */
export function isSensitiveKey(rawKey: string): boolean {
  const key = normalizeKey(rawKey)
  return SENSITIVE_REDACT_KEYS.some((k) => key === k || key.includes(k))
}

/**
 * Scan a free-text value for clinical narrative content.
 *
 * @param value - The text to inspect.
 * @returns The first matching {@link CLINICAL_TEXT_PATTERNS} source, or `null`.
 */
export function matchClinicalText(value: string): string | null {
  for (const pattern of CLINICAL_TEXT_PATTERNS) {
    if (pattern.test(value)) return pattern.source
  }
  return null
}
