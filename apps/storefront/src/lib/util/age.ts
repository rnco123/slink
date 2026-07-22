import "server-only"
import { cookies as nextCookies } from "next/headers"

/**
 * Age-gate read helpers (roadmap task 21c). Plain server-only utilities (NOT a
 * "use server" module) so they can be called synchronously during a Server
 * Component render. The one mutating action (setAgeVerified) lives separately in
 * `lib/data/age-verification.ts` because it must be a Server Action.
 *
 * Self-attestation only — no DOB/PHI is stored, just a boolean cookie.
 */

export const AGE_COOKIE = "age_verified"
export const DEFAULT_MIN_AGE = 18

/** Has the visitor already attested to their age? (server-read httpOnly cookie) */
export async function isAgeVerified(): Promise<boolean> {
  try {
    const cookies = await nextCookies()
    return cookies.get(AGE_COOKIE)?.value === "1"
  } catch {
    return false
  }
}

/** Read a product's age requirement from its metadata (defensive parsing). */
export function readAgeRequirement(
  metadata: Record<string, unknown> | null | undefined
): { required: boolean; minAge: number } {
  const raw = metadata?.requires_age_verification
  const required = raw === true || raw === "true" || raw === 1 || raw === "1"

  const rawMin = metadata?.min_age
  const parsed =
    typeof rawMin === "number"
      ? rawMin
      : typeof rawMin === "string"
      ? parseInt(rawMin, 10)
      : NaN
  const minAge =
    Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_MIN_AGE

  return { required, minAge }
}
