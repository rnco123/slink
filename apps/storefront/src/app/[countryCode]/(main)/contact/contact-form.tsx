"use client"

import { useActionState } from "react"
import { Button } from "@components/ui/button"
import { submitContact, type ContactState } from "./actions"

const initialState: ContactState = { ok: false }

export type ContactFormCopy = {
  formTitle: string
  formIntro: string
  nameLabel: string
  emailLabel: string
  phoneLabel: string
  messageLabel: string
  messageHint: string
  submit: string
  submitting: string
  successTitle: string
  successBody: string
  phiNotice: string
  securityNote: string
}

/**
 * Contact form. Posts to the rate-limited `/store/contact` endpoint via a server
 * action, so the backend URL and publishable key never reach the browser.
 *
 * Accessibility: every control has a real <label> (not a placeholder), errors are
 * wired with aria-describedby + aria-invalid, and the success state uses
 * role="status" so screen readers announce it without stealing focus.
 */
export default function ContactForm({ t }: { t: ContactFormCopy }) {
  const [state, formAction, pending] = useActionState(
    submitContact,
    initialState
  )

  const field =
    "w-full rounded-lg border border-line bg-cream px-4 py-2.5 text-ink outline-none transition-shadow placeholder:text-ink-subtle focus:border-evergreen-600 focus:shadow-focus"
  const labelCls = "block text-sm font-medium text-evergreen-800"
  const errCls = "mt-1 text-sm text-clay-600"

  if (state.ok) {
    return (
      <div
        role="status"
        className="rounded-xl border border-evergreen-600/30 bg-evergreen-50 p-8 text-center"
        data-testid="contact-success"
      >
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-evergreen-600 text-cream">
          <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M5 13l4 4L19 7"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h2 className="mt-4 font-display text-xl text-evergreen-800">
          {t.successTitle}
        </h2>
        <p className="mt-2 text-ink-muted">{t.successBody}</p>
      </div>
    )
  }

  return (
    <form
      action={formAction}
      className="rounded-xl border border-line bg-surface p-6 shadow-sm sm:p-8"
      data-testid="contact-form"
      noValidate
    >
      <h2 className="font-display text-xl text-evergreen-800">{t.formTitle}</h2>
      <p className="mt-2 text-sm text-ink-muted">{t.formIntro}</p>

      {state.error ? (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-clay-500/30 bg-clay-50 px-4 py-3 text-sm text-clay-600"
        >
          {state.error}
        </p>
      ) : null}

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="contact-name" className={labelCls}>
            {t.nameLabel}
          </label>
          <input
            id="contact-name"
            name="name"
            required
            autoComplete="name"
            className={`mt-1.5 ${field}`}
            aria-invalid={!!state.fieldErrors?.name}
            aria-describedby={
              state.fieldErrors?.name ? "contact-name-error" : undefined
            }
          />
          {state.fieldErrors?.name ? (
            <p id="contact-name-error" className={errCls}>
              {state.fieldErrors.name}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor="contact-email" className={labelCls}>
            {t.emailLabel}
          </label>
          <input
            id="contact-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className={`mt-1.5 ${field}`}
            aria-invalid={!!state.fieldErrors?.email}
            aria-describedby={
              state.fieldErrors?.email ? "contact-email-error" : undefined
            }
          />
          {state.fieldErrors?.email ? (
            <p id="contact-email-error" className={errCls}>
              {state.fieldErrors.email}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-5">
        <label htmlFor="contact-phone" className={labelCls}>
          {t.phoneLabel}
        </label>
        <input
          id="contact-phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          inputMode="tel"
          className={`mt-1.5 ${field}`}
          aria-invalid={!!state.fieldErrors?.phone}
          aria-describedby={
            state.fieldErrors?.phone ? "contact-phone-error" : undefined
          }
        />
        {state.fieldErrors?.phone ? (
          <p id="contact-phone-error" className={errCls}>
            {state.fieldErrors.phone}
          </p>
        ) : null}
      </div>

      <div className="mt-5">
        <label htmlFor="contact-message" className={labelCls}>
          {t.messageLabel}
        </label>
        <textarea
          id="contact-message"
          name="message"
          required
          rows={6}
          className={`mt-1.5 resize-y ${field}`}
          aria-invalid={!!state.fieldErrors?.message}
          aria-describedby="contact-message-hint"
        />
        <p id="contact-message-hint" className="mt-1.5 text-xs text-ink-subtle">
          {t.messageHint}
        </p>
        {state.fieldErrors?.message ? (
          <p className={errCls}>{state.fieldErrors.message}</p>
        ) : null}
      </div>

      {/* Honeypot — visually hidden and skipped by keyboard/AT, so only bots fill it. */}
      <div aria-hidden="true" className="hidden">
        <label htmlFor="contact-company">Company</label>
        <input
          id="contact-company"
          name="company"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      {/* Security assurance. States ONLY what is actually true: the submission
          travels over TLS (Caddy terminates HTTPS site-wide) and we don't sell
          personal information (per the privacy policy). Deliberately NOT a
          third-party "secured by" seal — those must be earned/paid for, and
          displaying one you don't hold is deceptive. The real LegitScript seal
          goes in the footer when it's issued (task 43). */}
      <p className="mt-6 flex items-start gap-2 text-xs text-ink-subtle">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          aria-hidden="true"
          className="mt-px shrink-0 text-evergreen-700"
        >
          <path
            d="M7 10V7a5 5 0 0 1 10 0v3"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <rect
            x="4"
            y="10"
            width="16"
            height="10"
            rx="2"
            fill="currentColor"
          />
        </svg>
        <span>{t.securityNote}</span>
      </p>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-ink-subtle">{t.phiNotice}</p>
        <Button
          type="submit"
          variant="accent"
          disabled={pending}
          className="shrink-0 disabled:opacity-60"
          data-testid="contact-submit"
        >
          {pending ? t.submitting : t.submit}
        </Button>
      </div>
    </form>
  )
}
