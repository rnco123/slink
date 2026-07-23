"use client"

/**
 * Segment error boundary (roadmap task 55) for all localized routes. Renders
 * inside the root layout, so a nav/footer stays around the recovery message.
 * Reports PHI-safely (name + digest only).
 */
import { useEffect } from "react"
import { reportError } from "@lib/util/report-error"

export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    reportError(error, { boundary: "locale-segment" })
  }, [error])

  return (
    <div
      className="content-container flex min-h-[50vh] flex-col items-center justify-center gap-4 py-16 text-center"
      data-testid="error-boundary"
    >
      <h1 className="text-2xl font-medium">Something went wrong</h1>
      <p className="max-w-md text-ui-fg-subtle">
        We hit an unexpected error loading this page. Please try again — if it
        keeps happening, contact support.
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-md bg-ui-button-inverted px-4 py-2 text-sm font-medium text-ui-fg-on-inverted"
        >
          Try again
        </button>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- a hard full-page reload is the intended recovery from an error boundary (resets client state / escapes the errored subtree); a client-nav Link would keep the broken state. */}
        <a
          href="/"
          className="rounded-md border border-ui-border-base px-4 py-2 text-sm font-medium"
        >
          Go home
        </a>
      </div>
    </div>
  )
}
