"use server"

import { sdk } from "@lib/config"

export type ContactState = {
  ok: boolean
  /** Form-level error shown above the fields. */
  error?: string
  /** Per-field messages, keyed by input name. */
  fieldErrors?: Record<string, string>
}

/**
 * Submit the contact form to the rate-limited `/store/contact` endpoint.
 *
 * PHI note: the message may contain health details, so it is passed straight
 * through to the backend and never logged, stored in analytics, or echoed back
 * into the rendered page.
 */
export async function submitContact(
  _prev: ContactState,
  formData: FormData
): Promise<ContactState> {
  const payload = {
    name: String(formData.get("name") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
    topic: String(formData.get("topic") ?? "other"),
    message: String(formData.get("message") ?? "").trim(),
    // Honeypot — must stay empty for a real submission.
    company: String(formData.get("company") ?? ""),
  }

  try {
    await sdk.client.fetch("/store/contact", {
      method: "POST",
      body: payload,
    })
    return { ok: true }
  } catch (err: unknown) {
    // Surface the backend's field-level messages when it returned 400, so the
    // visitor can fix the specific input rather than guessing.
    const body = (err as { response?: { data?: unknown } })?.response?.data as
      | { errors?: Array<{ field?: string; message?: string }> }
      | undefined

    if (body?.errors?.length) {
      const fieldErrors: Record<string, string> = {}
      for (const e of body.errors) {
        if (e.field && e.message) fieldErrors[e.field] = e.message
      }
      return { ok: false, fieldErrors }
    }

    const status = (err as { status?: number })?.status
    if (status === 429) {
      return {
        ok: false,
        error: "Too many messages just now. Please try again in a minute.",
      }
    }

    return {
      ok: false,
      error: "Something went wrong sending your message. Please try again.",
    }
  }
}
