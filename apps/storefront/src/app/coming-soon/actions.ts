"use server"

import { cookies } from "next/headers"
import {
  PREVIEW_COOKIE,
  PREVIEW_MAX_AGE,
  PREVIEW_TOKEN,
  getPreviewCode,
} from "@lib/preview"

export type PreviewState = { ok: boolean; error?: string }

/**
 * Verify the 6-digit preview code and, on success, set the httpOnly `preview_ok`
 * cookie that lets the middleware wave the visitor past the coming-soon wall.
 *
 * Used with `useActionState` from the unlock form. Never leaks the expected code
 * to the client — comparison happens entirely server-side.
 */
export async function verifyPreviewCode(
  _prev: PreviewState,
  formData: FormData
): Promise<PreviewState> {
  const code = String(formData.get("code") ?? "").trim()

  if (!/^\d{6}$/.test(code)) {
    return { ok: false, error: "Enter the 6-digit code." }
  }

  if (code !== getPreviewCode()) {
    return { ok: false, error: "That code isn't right. Please try again." }
  }

  const jar = await cookies()
  jar.set(PREVIEW_COOKIE, PREVIEW_TOKEN, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: PREVIEW_MAX_AGE,
  })

  return { ok: true }
}
