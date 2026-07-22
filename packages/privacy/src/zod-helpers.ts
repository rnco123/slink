/**
 * Zod building blocks for PHI-safe, strict request schemas.
 *
 * Every public API on the website must validate its input with a strict schema
 * built from these helpers. "Strict" means unknown properties are rejected
 * (HTTP 400), and PHI-bearing keys/values are rejected even if a developer
 * forgets to think about them.
 *
 * @packageDocumentation
 */

import { z } from "zod"
import { validateNoPhi } from "./validate-no-phi"
import { matchClinicalText } from "./prohibited-fields"

/**
 * Create a strict object schema: unknown keys cause a validation error rather
 * than being stripped. Prefer this over `z.object()` for every request body.
 *
 * @param shape - The Zod shape.
 * @returns A strict `ZodObject`.
 */
export function strictObject<T extends z.ZodRawShape>(
  shape: T
): z.ZodObject<T, "strict"> {
  return z.object(shape).strict()
}

/**
 * A Zod refinement that fails if the parsed value contains any PHI (prohibited
 * keys anywhere in the tree). Attach to any schema as defense-in-depth.
 *
 * @param schema - The schema to guard.
 * @returns The same schema with a PHI check appended.
 *
 * @example
 * ```ts
 * const Safe = withNoPhi(strictObject({ email: emailField() }))
 * ```
 */
export function withNoPhi<S extends z.ZodTypeAny>(schema: S): z.ZodEffects<S> {
  return schema.superRefine((value, ctx) => {
    const result = validateNoPhi(value)
    for (const v of result.violations) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        // Never echo the value — only the structural reason.
        message:
          "Medical or clinical information is not accepted on this website.",
        path: v.path.split("."),
        params: { phi: true, keyword: v.keyword, reason: v.reason },
      })
    }
  })
}

/**
 * A string schema that rejects free-text clinical narratives. Use for message /
 * comment / description fields on contact and support forms. Do NOT use for
 * product search inputs — those are legitimate commerce queries.
 *
 * @param opts - Length constraints.
 * @returns A `ZodEffects<ZodString>` that rejects clinical text.
 */
export function phiSafeText(
  opts: { min?: number; max?: number } = {}
): z.ZodEffects<z.ZodString> {
  const { min = 1, max = 2000 } = opts
  return z
    .string()
    .min(min)
    .max(max)
    .superRefine((value, ctx) => {
      const hit = matchClinicalText(value)
      if (hit) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "Please do not enter medical or treatment information on this website. Use the secure telemedicine portal for clinical questions.",
          params: { phi: true, pattern: hit },
        })
      }
    })
}

// ---------------------------------------------------------------------------
// Reusable commerce field schemas (identity + address + order primitives).
// ---------------------------------------------------------------------------

/** An email address (lower-cased, trimmed). */
export const emailField = (): z.ZodString =>
  z
    .string()
    .trim()
    .toLowerCase()
    .email("A valid email address is required.")
    .max(254)

/** A person / company name (no clinical narrative). */
export const nameField = (max = 100): z.ZodString =>
  z.string().trim().min(1).max(max)

/**
 * A loose international phone number. Digits, spaces, and `+ ( ) -` only; 7–20
 * characters. Kept permissive to avoid rejecting valid international formats.
 */
export const phoneField = (): z.ZodString =>
  z
    .string()
    .trim()
    .regex(/^[+()\-\s\d]{7,20}$/, "A valid phone number is required.")

/** A BCP-47-ish locale such as `en` or `es-US`. */
export const localeField = (): z.ZodString =>
  z
    .string()
    .trim()
    .regex(/^[a-z]{2}(-[A-Z]{2})?$/, "Invalid locale.")

/** An ISO 3166-1 alpha-2 country code (upper-cased). */
export const countryCodeField = (): z.ZodString =>
  z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/, "A 2-letter country code is required.")

/** A postal / ZIP code. */
export const postalCodeField = (): z.ZodString =>
  z.string().trim().min(2).max(12)

/** A short opaque identifier (Medusa/Cognito id, coupon code, etc.). */
export const idField = (max = 128): z.ZodString =>
  z.string().trim().min(1).max(max)

/**
 * A strict postal address. All fields are commerce identity; there is no room
 * for a free-text note that could carry PHI. Return type is inferred so callers
 * get the precise shape.
 */
export const addressSchema = () =>
  strictObject({
    first_name: nameField(),
    last_name: nameField(),
    company: nameField().optional(),
    address_1: z.string().trim().min(1).max(200),
    address_2: z.string().trim().max(200).optional(),
    city: z.string().trim().min(1).max(100),
    province: z.string().trim().max(100).optional(),
    postal_code: postalCodeField(),
    country_code: countryCodeField(),
    phone: phoneField().optional(),
  })
