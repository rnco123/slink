"use client"

import { useActionState, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { verifyPreviewCode, type PreviewState } from "./actions"

const initialState: PreviewState = { ok: false }

/**
 * Progressive preview unlock. Starts as a single quiet link ("Have a preview
 * code?"); clicking reveals the 6-digit form. On success the cookie is set
 * server-side, so a router refresh re-runs middleware and drops the visitor onto
 * the real site.
 */
export default function PreviewUnlock() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [state, formAction, pending] = useActionState(
    verifyPreviewCode,
    initialState
  )

  useEffect(() => {
    if (state.ok) {
      // Cookie is now set; re-run middleware so the wall lets us through.
      router.refresh()
      router.push("/")
    }
  }, [state.ok, router])

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm font-medium text-sand-200 underline decoration-gold-500/60 underline-offset-4 transition-colors hover:text-cream"
      >
        Have a preview code?
      </button>
    )
  }

  return (
    <form action={formAction} className="flex flex-col items-center gap-3">
      <label htmlFor="preview-code" className="sr-only">
        6-digit preview code
      </label>
      <div className="flex items-center gap-2">
        <input
          id="preview-code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{6}"
          maxLength={6}
          required
          autoFocus
          placeholder="••••••"
          aria-describedby={state.error ? "preview-error" : undefined}
          aria-invalid={!!state.error}
          className="w-40 rounded bg-cream/95 px-4 py-2 text-center font-mono text-lg tracking-[0.4em] text-ink shadow-focus outline-none ring-2 ring-transparent focus:ring-gold-500"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-gold-500 px-4 py-2 text-sm font-semibold text-evergreen-900 transition-colors hover:bg-gold-300 disabled:opacity-60"
        >
          {pending ? "Checking…" : "Enter"}
        </button>
      </div>
      {state.error ? (
        <p id="preview-error" role="alert" className="text-sm text-clay-200">
          {state.error}
        </p>
      ) : null}
    </form>
  )
}
