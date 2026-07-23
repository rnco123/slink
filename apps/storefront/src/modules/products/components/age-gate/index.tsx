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
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 id="age-gate-title" className="text-xl font-semibold">
          Age verification
        </h2>

        {declined ? (
          <>
            <p className="mt-3 text-sm text-ui-fg-subtle">
              We&apos;re sorry — you must be at least {minAge} years old to view
              or purchase this product.
            </p>
            <button
              type="button"
              onClick={() => router.push("/store")}
              className="mt-5 w-full rounded-md bg-ui-button-inverted px-4 py-2 text-sm font-medium text-ui-fg-on-inverted"
            >
              Back to store
            </button>
          </>
        ) : (
          <>
            <p className="mt-3 text-sm text-ui-fg-subtle">
              This product requires age verification. Please confirm you are at
              least <strong>{minAge}</strong> years old to continue.
            </p>
            <div className="mt-5 flex flex-col gap-2 small:flex-row">
              <button
                type="button"
                onClick={confirm}
                disabled={pending}
                data-testid="age-gate-confirm"
                className="w-full rounded-md bg-ui-button-inverted px-4 py-2 text-sm font-medium text-ui-fg-on-inverted disabled:opacity-60"
              >
                {pending ? "Confirming…" : `I am ${minAge} or older`}
              </button>
              <button
                type="button"
                onClick={() => setDeclined(true)}
                data-testid="age-gate-decline"
                className="w-full rounded-md border border-ui-border-base px-4 py-2 text-sm font-medium"
              >
                I am under {minAge}
              </button>
            </div>
            <p className="mt-3 text-xs text-ui-fg-muted">
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
