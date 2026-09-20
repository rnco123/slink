"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { setAgeVerified } from "@lib/data/age-verification"

/**
 * Age gate (roadmap task 21c) — a blocking self-attestation modal shown on the
 * PDP for products whose metadata sets `requires_age_verification`. Rendered by
 * the server ONLY when the product requires it AND the visitor hasn't already
 * confirmed (age_verified cookie absent), so verified visitors never see it.
 *
 * Confirm → server action sets the cookie, then refresh reveals the product.
 * Decline → sent back to the store; nothing is purchasable while gated.
 *
 * Self-attestation only — no DOB/PHI is collected or stored.
 */
type Props = { minAge: number }

const AgeGate = ({ minAge }: Props) => {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [declined, setDeclined] = useState(false)

  const confirm = () => {
    startTransition(async () => {
      await setAgeVerified()
      router.refresh()
    })
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="age-gate-title"
      data-testid="age-gate"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/60 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-md rounded-xl border border-line bg-cream p-6 shadow-lg">
        <h2
          id="age-gate-title"
          className="font-display text-xl text-evergreen-800"
        >
          Age verification
        </h2>

        {declined ? (
          <>
            <p className="mt-3 text-sm text-ink-muted">
              We&apos;re sorry — you must be at least {minAge} years old to view
              or purchase this product.
            </p>
            <button
              type="button"
              onClick={() => router.push("/store")}
              className="mt-5 w-full rounded-pill bg-evergreen-700 px-4 py-2.5 text-sm font-semibold text-cream transition-colors hover:bg-evergreen-800"
            >
              Back to store
            </button>
          </>
        ) : (
          <>
            <p className="mt-3 text-sm text-ink-muted">
              This product requires age verification. Please confirm you are at
              least <strong>{minAge}</strong> years old to continue.
            </p>
            <div className="mt-5 flex flex-col gap-2 small:flex-row">
              <button
                type="button"
                onClick={confirm}
                disabled={pending}
                data-testid="age-gate-confirm"
                className="w-full rounded-pill bg-evergreen-700 px-4 py-2.5 text-sm font-semibold text-cream transition-colors hover:bg-evergreen-800 disabled:opacity-60"
              >
                {pending ? "Confirming…" : `I am ${minAge} or older`}
              </button>
              <button
                type="button"
                onClick={() => setDeclined(true)}
                data-testid="age-gate-decline"
                className="w-full rounded-pill border border-line-strong bg-white px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-sand-50"
              >
                I am under {minAge}
              </button>
            </div>
            <p className="mt-3 text-xs text-ink-subtle">
              By confirming you attest that the above is accurate. We do not
              store your date of birth.
            </p>
          </>
        )}
      </div>
    </div>
  )
}

export default AgeGate
