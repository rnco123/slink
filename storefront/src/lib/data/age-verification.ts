"use server"

import { cookies as nextCookies } from "next/headers"
import { AGE_COOKIE } from "@lib/util/age"

/**
 * Age-gate mutation (roadmap task 21c). A Server Action, invoked from the
 * client AgeGate component to record the visitor's age self-attestation in an
 * httpOnly cookie (server-set, like the coming-soon wall). Read helpers live in
 * `lib/util/age.ts` (plain module) so they can run during render.
 */

const MAX_AGE = 60 * 60 * 24 * 30 // 30 days

export async function setAgeVerified(): Promise<{ ok: true }> {
  const cookies = await nextCookies()
  cookies.set(AGE_COOKIE, "1", {
    maxAge: MAX_AGE,
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  })
  return { ok: true }
}
