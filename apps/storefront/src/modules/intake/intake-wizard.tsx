"use client"

import { useMemo, useState } from "react"
import { Button } from "@components/ui/button"
import {
  SECTIONS,
  highRiskFlags,
  type Answers,
  type Field,
} from "./intake-config"

/**
 * Telemedicine intake wizard — UI + frontend logic ONLY.
 *
 * PHI SAFETY (read before changing):
 *  - All answers live in React state for the session only. NOTHING is written to
 *    localStorage/sessionStorage, the commerce API, or analytics.
 *  - `submitIntake` below is the SINGLE integration point. It must POST to a
 *    HIPAA-compliant telehealth backend under a BAA — NEVER to the Medusa
 *    commerce API, and PHI must never be logged. Until that backend exists it
 *    is intentionally stubbed and no data leaves the browser.
 */

const field =
  "w-full rounded-lg border border-line bg-cream px-4 py-2.5 text-ink outline-none transition-shadow placeholder:text-ink-subtle focus:border-evergreen-600 focus:shadow-focus"
const labelCls = "block text-sm font-medium text-evergreen-800"

// INTEGRATION POINT — wire to your HIPAA backend. Do NOT send to the commerce API.
async function submitIntake(_answers: Answers): Promise<{ ok: boolean }> {
  // Example (when your BAA-covered endpoint exists):
  //   await fetch(process.env.NEXT_PUBLIC_INTAKE_ENDPOINT!, {
  //     method: "POST", headers: { "Content-Type": "application/json" },
  //     body: JSON.stringify(_answers),
  //   })
  // For now: no backend configured → nothing is transmitted or stored.
  return { ok: true }
}

export default function IntakeWizard() {
  const [answers, setAnswers] = useState<Answers>({})
  const [step, setStep] = useState(0)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [pending, setPending] = useState(false)

  const set = (id: string, value: unknown) =>
    setAnswers((a) => ({ ...a, [id]: value }))

  const isReview = step === SECTIONS.length
  const section = SECTIONS[step]
  const flags = useMemo(() => highRiskFlags(answers), [answers])

  const visibleFields = (s = section): Field[] =>
    s.fields.filter((f) => !f.showIf || f.showIf(answers))

  const validateStep = (): boolean => {
    const errs: Record<string, string> = {}
    for (const f of visibleFields()) {
      if (f.optional || f.type === "computed") continue
      const v = answers[f.id]
      const empty =
        v == null ||
        v === "" ||
        (Array.isArray(v) && v.length === 0) ||
        (f.type === "heightUS" && !answers.height_ft)
      if (empty) errs[f.id] = "Required"
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const next = () => {
    if (!validateStep()) return
    setStep((s) => Math.min(s + 1, SECTIONS.length))
    window.scrollTo({ top: 0, behavior: "smooth" })
  }
  const back = () => {
    setErrors({})
    setStep((s) => Math.max(s - 1, 0))
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const onSubmit = async () => {
    setPending(true)
    const res = await submitIntake(answers)
    setPending(false)
    if (res.ok) setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="rounded-xl border border-evergreen-600/30 bg-evergreen-50 p-8 text-center">
        <h2 className="font-display text-2xl text-evergreen-800">
          Intake received
        </h2>
        <p className="mx-auto mt-3 max-w-md text-ink-muted">
          Thank you.{" "}
          {flags.length > 0
            ? "Because of your answers, a provider will review your information before scheduling. "
            : "A licensed provider will review your information. "}
          We’ll follow up by email. For emergencies, call 911.
        </p>
        {flags.length > 0 && (
          <p className="mt-4 text-sm text-clay-600">
            Flagged for provider review: {flags.join(", ")}.
          </p>
        )}
      </div>
    )
  }

  const progress = Math.round((step / SECTIONS.length) * 100)

  return (
    <div>
      {/* Progress */}
      <div className="mb-8">
        <div className="flex items-center justify-between text-xs text-ink-subtle">
          <span>
            Step {step + 1} of {SECTIONS.length + 1}
          </span>
          <span>{progress}%</span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-sand-200">
          <div
            className="h-full rounded-full bg-evergreen-600 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* High-risk STOP banner */}
      {flags.length > 0 && (
        <div
          role="alert"
          className="mb-6 rounded-lg border border-clay-500/40 bg-clay-50 p-4"
        >
          <p className="text-sm font-semibold text-clay-700">
            Provider review required before scheduling
          </p>
          <p className="mt-1 text-sm text-clay-600">
            Based on your answers ({flags.join(", ")}), a licensed provider must
            review your chart before any treatment. You can still complete this
            intake.
          </p>
        </div>
      )}

      {isReview ? (
        <ReviewStep
          answers={answers}
          flags={flags}
          onEdit={(i) => setStep(i)}
        />
      ) : (
        <div>
          <h2 className="font-display text-2xl text-evergreen-800">
            {section.title}
          </h2>
          {section.intro && (
            <p className="mt-2 text-sm text-ink-muted">{section.intro}</p>
          )}
          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            {visibleFields().map((f) => (
              <FieldControl
                key={f.id}
                f={f}
                answers={answers}
                set={set}
                error={errors[f.id]}
              />
            ))}
          </div>
        </div>
      )}

      {/* Nav */}
      <div className="mt-10 flex items-center justify-between border-t border-line pt-6">
        <button
          type="button"
          onClick={back}
          disabled={step === 0}
          className="text-sm text-ink-subtle transition-colors hover:text-evergreen-700 disabled:opacity-40"
        >
          ← Back
        </button>
        {isReview ? (
          <Button
            variant="accent"
            onClick={onSubmit}
            disabled={pending}
            className="disabled:opacity-60"
          >
            {pending ? "Submitting…" : "Submit intake"}
          </Button>
        ) : (
          <Button variant="primary" onClick={next}>
            {step === SECTIONS.length - 1 ? "Review" : "Continue"}
          </Button>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------

function FieldControl({
  f,
  answers,
  set,
  error,
}: {
  f: Field
  answers: Answers
  set: (id: string, v: unknown) => void
  error?: string
}) {
  const v = answers[f.id]
  const full = ["textarea", "checkboxes", "heightUS", "home_address"].includes(
    f.type
  )
    ? "sm:col-span-2"
    : ""
  const errCls = error ? " border-clay-500" : ""

  const Label = (
    <label htmlFor={f.id} className={labelCls}>
      {f.label}
      {f.optional && (
        <span className="ml-1 font-normal text-ink-subtle">(optional)</span>
      )}
      {f.unit && (
        <span className="ml-1 font-normal text-ink-subtle">({f.unit})</span>
      )}
    </label>
  )

  return (
    <div
      className={
        f.type === "textarea" || f.id === "home_address"
          ? "sm:col-span-2"
          : full
      }
    >
      {f.type !== "yesno" && Label}

      {(f.type === "text" ||
        f.type === "email" ||
        f.type === "tel" ||
        f.type === "number" ||
        f.type === "date") && (
        <input
          id={f.id}
          type={f.type === "number" ? "number" : f.type}
          value={(v as string) ?? ""}
          placeholder={f.placeholder}
          onChange={(e) => set(f.id, e.target.value)}
          className={`mt-1.5 ${field}${errCls}`}
        />
      )}

      {f.type === "textarea" && (
        <textarea
          id={f.id}
          rows={3}
          value={(v as string) ?? ""}
          placeholder={f.placeholder}
          onChange={(e) => set(f.id, e.target.value)}
          className={`mt-1.5 resize-y ${field}${errCls}`}
        />
      )}

      {f.type === "select" && (
        <select
          id={f.id}
          value={(v as string) ?? ""}
          onChange={(e) => set(f.id, e.target.value)}
          className={`mt-1.5 ${field}${errCls}`}
        >
          <option value="">Select…</option>
          {f.options?.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      )}

      {f.type === "radio" && (
        <div className="mt-2 flex flex-wrap gap-2">
          {f.options?.map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => set(f.id, o)}
              className={`rounded-lg border px-4 py-2 text-sm transition-colors ${
                v === o
                  ? "border-evergreen-600 bg-evergreen-50 text-evergreen-800"
                  : "border-line bg-cream text-ink hover:border-evergreen-400"
              }`}
            >
              {o}
            </button>
          ))}
        </div>
      )}

      {f.type === "yesno" && (
        <fieldset>
          <legend className={labelCls}>{f.label}</legend>
          <div className="mt-2 flex gap-2">
            {["Yes", "No"].map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => set(f.id, o)}
                className={`rounded-lg border px-5 py-2 text-sm transition-colors ${
                  v === o
                    ? "border-evergreen-600 bg-evergreen-50 text-evergreen-800"
                    : "border-line bg-cream text-ink hover:border-evergreen-400"
                }`}
              >
                {o}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {f.type === "checkboxes" && (
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {f.options?.map((o) => {
            const arr = Array.isArray(v) ? (v as string[]) : []
            const on = arr.includes(o)
            return (
              <label
                key={o}
                className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                  on
                    ? "border-evergreen-600 bg-evergreen-50 text-evergreen-800"
                    : "border-line bg-cream text-ink hover:border-evergreen-400"
                }`}
              >
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() =>
                    set(f.id, on ? arr.filter((x) => x !== o) : [...arr, o])
                  }
                  className="accent-evergreen-600"
                />
                {o}
              </label>
            )
          })}
        </div>
      )}

      {f.type === "heightUS" && (
        <div className="mt-1.5 flex gap-3">
          <input
            type="number"
            aria-label="Height feet"
            placeholder="ft"
            value={(answers.height_ft as string) ?? ""}
            onChange={(e) => set("height_ft", e.target.value)}
            className={`${field}${errCls}`}
          />
          <input
            type="number"
            aria-label="Height inches"
            placeholder="in"
            value={(answers.height_in as string) ?? ""}
            onChange={(e) => set("height_in", e.target.value)}
            className={field}
          />
        </div>
      )}

      {f.type === "file" && (
        <input
          id={f.id}
          type="file"
          accept="image/*,.pdf"
          onChange={(e) => set(f.id, e.target.files?.[0]?.name ?? "")}
          className={`mt-1.5 block w-full text-sm text-ink file:mr-3 file:rounded-md file:border-0 file:bg-evergreen-600 file:px-4 file:py-2 file:text-cream`}
        />
      )}

      {f.type === "signature" && (
        <input
          id={f.id}
          type="text"
          value={(v as string) ?? ""}
          placeholder="Type your full legal name"
          onChange={(e) => set(f.id, e.target.value)}
          className={`mt-1.5 font-display text-lg ${field}${errCls}`}
        />
      )}

      {f.type === "computed" && (
        <div className="mt-1.5 rounded-lg border border-dashed border-line bg-sand-50 px-4 py-2.5 text-ink">
          {f.compute ? f.compute(answers) : "—"}
        </div>
      )}

      {f.help && <p className="mt-1 text-xs text-ink-subtle">{f.help}</p>}
      {error && <p className="mt-1 text-sm text-clay-600">{error}</p>}
    </div>
  )
}

function ReviewStep({
  answers,
  flags,
  onEdit,
}: {
  answers: Answers
  flags: string[]
  onEdit: (i: number) => void
}) {
  return (
    <div>
      <h2 className="font-display text-2xl text-evergreen-800">
        Review & submit
      </h2>
      <p className="mt-2 text-sm text-ink-muted">
        Please confirm your answers. You can edit any section.
      </p>
      <div className="mt-6 space-y-4">
        {SECTIONS.map((s, i) => (
          <div
            key={s.id}
            className="rounded-lg border border-line bg-surface p-5"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-evergreen-800">{s.title}</h3>
              <button
                type="button"
                onClick={() => onEdit(i)}
                className="text-sm text-clay-500 hover:text-clay-600"
              >
                Edit
              </button>
            </div>
            <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
              {s.fields
                .filter((f) => !f.showIf || f.showIf(answers))
                .map((f) => {
                  const val = f.compute ? f.compute(answers) : answers[f.id]
                  const display = Array.isArray(val)
                    ? val.join(", ")
                    : val || "—"
                  return (
                    <div key={f.id} className="flex justify-between gap-3">
                      <dt className="text-ink-subtle">{f.label}</dt>
                      <dd className="text-right text-ink">{String(display)}</dd>
                    </div>
                  )
                })}
            </dl>
          </div>
        ))}
      </div>
      {flags.length > 0 && (
        <p className="mt-4 text-sm text-clay-600">
          Note: your chart will be marked for provider review before scheduling.
        </p>
      )}
    </div>
  )
}
