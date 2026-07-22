/**
 * Allowlist-based object sanitization.
 *
 * Where {@link validateNoPhi} *rejects* PHI, this module *constructs* safe
 * objects by copying only explicitly-approved keys. It is the tool used to build
 * Medusa `metadata`, Cognito attributes, and analytics payloads server-side,
 * instead of trusting a browser-supplied blob.
 *
 * Rule of thumb: schemas reject unknown input (fail closed with HTTP 400);
 * metadata builders filter to an allowlist (fail closed by omission). Both never
 * let unapproved data through.
 *
 * @packageDocumentation
 */

import { normalizeKey, matchProhibitedKey } from "./prohibited-fields"
import { assertNoPhi } from "./validate-no-phi"

/** A plain JSON-serializable object. */
export type PlainObject = Record<string, unknown>

/**
 * Options for {@link sanitizeObject}.
 */
export interface SanitizeOptions {
  /**
   * When `true`, throw {@link PhiDetectedError} if any allowlisted key still
   * matches a PHI pattern (defense-in-depth against a mis-configured allowlist).
   *
   * @defaultValue `true`
   */
  readonly assertNoPhi?: boolean
  /**
   * When `true`, recurse into nested plain objects, applying the same allowlist
   * at every level. When `false`, only top-level keys are considered and nested
   * objects are dropped unless their key is allowlisted (and copied wholesale).
   *
   * @defaultValue `false`
   */
  readonly deep?: boolean
}

function isPlainObject(v: unknown): v is PlainObject {
  return (
    typeof v === "object" &&
    v !== null &&
    !Array.isArray(v) &&
    Object.getPrototypeOf(v) === Object.prototype
  )
}

/**
 * Build a new object containing only the allowlisted keys of `input`.
 *
 * Unknown keys are silently dropped — the returned object is safe to hand to
 * Medusa/Cognito/analytics. Prohibited (PHI) keys are always dropped even if a
 * caller mistakenly lists them, and (by default) trigger an assertion so the
 * mistake surfaces in development.
 *
 * @param input - The untrusted source object (e.g. `request.body.metadata`).
 * @param allowedKeys - The keys permitted in the output. Compared using the same
 *   normalization as the firewall, so `postalCode` and `postal_code` are equal.
 * @param options - See {@link SanitizeOptions}.
 * @returns A new object with only approved, PHI-free keys.
 *
 * @example
 * ```ts
 * // BAD:  metadata = request.body.metadata
 * // GOOD:
 * const metadata = sanitizeObject(request.body.metadata, [
 *   "locale", "marketingSource", "giftOrder",
 * ])
 * ```
 */
export function sanitizeObject(
  input: unknown,
  allowedKeys: readonly string[],
  options: SanitizeOptions = {}
): PlainObject {
  const { assertNoPhi: shouldAssert = true, deep = false } = options
  const allow = new Set(allowedKeys.map(normalizeKey))
  const out: PlainObject = {}

  if (!isPlainObject(input)) return out

  for (const [key, value] of Object.entries(input)) {
    const norm = normalizeKey(key)
    if (!allow.has(norm)) continue
    // Never copy a prohibited key even if the caller allowlisted it by mistake.
    if (matchProhibitedKey(key)) continue

    if (deep && isPlainObject(value)) {
      out[key] = sanitizeObject(value, allowedKeys, options)
    } else if (deep && Array.isArray(value)) {
      out[key] = value.map((item) =>
        isPlainObject(item) ? sanitizeObject(item, allowedKeys, options) : item
      )
    } else {
      out[key] = value
    }
  }

  if (shouldAssert) assertNoPhi(out)
  return out
}

/**
 * The approved keys for Medusa `metadata` objects (cart, order, customer,
 * payment, product, fulfillment). Extend deliberately and review any addition.
 */
export const SAFE_MEDUSA_METADATA_KEYS: readonly string[] = [
  "locale",
  "currency_code",
  "marketing_source",
  "marketing_medium",
  "marketing_campaign",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "gift_order",
  "gift_message",
  "referral_code",
  "channel",
  "storefront_version",
]

/**
 * Construct a safe Medusa `metadata` object from untrusted input.
 *
 * A thin, intention-revealing wrapper over {@link sanitizeObject} pinned to
 * {@link SAFE_MEDUSA_METADATA_KEYS}. Use everywhere metadata is written for
 * carts, orders, customers, payments, products, and fulfillments.
 *
 * @param input - Untrusted source (typically part of a request body).
 * @param extraAllowedKeys - Additional approved keys for a specific call site.
 * @returns A PHI-free metadata object.
 */
export function buildSafeMetadata(
  input: unknown,
  extraAllowedKeys: readonly string[] = []
): PlainObject {
  return sanitizeObject(input, [
    ...SAFE_MEDUSA_METADATA_KEYS,
    ...extraAllowedKeys,
  ])
}

/**
 * The identity attributes Cognito is permitted to store. No clinical or
 * cross-system reference attributes may ever be added.
 */
export const SAFE_COGNITO_ATTRIBUTES: readonly string[] = [
  "email",
  "email_verified",
  "phone_number",
  "phone_number_verified",
  "given_name",
  "family_name",
  "name",
  "locale",
  "zoneinfo",
  "updated_at",
  "custom:marketing_opt_in",
  "custom:preferred_locale",
]

/**
 * Construct a safe Cognito attribute set from untrusted input.
 *
 * @param input - Untrusted source (e.g. registration payload).
 * @returns A PHI-free attribute object limited to {@link SAFE_COGNITO_ATTRIBUTES}.
 */
export function buildSafeCognitoAttributes(input: unknown): PlainObject {
  return sanitizeObject(input, SAFE_COGNITO_ATTRIBUTES)
}
