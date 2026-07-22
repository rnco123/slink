"use client"

/**
 * Root error boundary (roadmap task 55). Catches errors thrown in the ROOT
 * layout — the last line of defence — so visitors get a branded recovery page
 * instead of a blank screen. Because it replaces the root layout, it must
 * render its own <html>/<body>.
 *
 * Reports the failure PHI-safely (task 54 seam) — name + digest only, never the
 * message/stack.
 */
import { useEffect } from "react"
import { reportError } from "@lib/util/report-error"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    reportError(error, { boundary: "global-error" })
  }, [error])

  return (
    <html lang="en">
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          background: "#f7f5ef",
          color: "#1f2a24",
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          margin: 0,
          padding: "1.5rem",
        }}
      >
        <div style={{ maxWidth: 520, textAlign: "center" }}>
          <h1 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>
            Something went wrong
          </h1>
          <p style={{ color: "#5b6b62", marginBottom: "1.25rem" }}>
            We hit an unexpected error. Please try again — if it keeps
            happening, contact support.
          </p>
          <button
            onClick={reset}
            style={{
              background: "#2e5540",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "0.6rem 1.1rem",
              fontSize: "0.9rem",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
