/**
 * PHI-safe client error reporter (roadmap tasks 54 + 55).
 *
 * Error boundaries call this so runtime failures actually get reported instead
 * of dying silently. It is deliberately conservative for a health brand: it
 * sends only NON-PHI signal — the error name, Next's error `digest`, the route
 * path, and a timestamp. It NEVER transmits the error message or stack, which
 * can contain user-entered free text (potential PHI).
 *
 * Transport is pluggable via `NEXT_PUBLIC_ERROR_REPORT_URL` (e.g. a self-hosted
 * GlitchTip/Sentry tunnel or the Monitoring API ingest endpoint). When unset,
 * it just logs — so this is safe to ship before the error-tracking backend
 * (task 54) exists, and starts reporting the moment the URL is provided.
 */
export type ReportableError = {
  name?: string
  digest?: string
}

const ENDPOINT = process.env.NEXT_PUBLIC_ERROR_REPORT_URL

export function reportError(
  error: ReportableError,
  context: { boundary: string } = { boundary: "unknown" }
): void {
  // Only the error class name — not the message (may contain PHI/free text).
  const name =
    typeof error?.name === "string" && error.name ? error.name : "Error"

  const payload = {
    name,
    digest: error?.digest,
    boundary: context.boundary,
    path: typeof window !== "undefined" ? window.location.pathname : undefined,
    ts: new Date().toISOString(),
  }

  // Always leave a local breadcrumb.
  // eslint-disable-next-line no-console
  console.error(`[reportError:${context.boundary}]`, name, error?.digest ?? "")

  if (!ENDPOINT || typeof navigator === "undefined") return

  try {
    const body = JSON.stringify(payload)
    // sendBeacon survives page unload; fall back to fetch keepalive.
    if (navigator.sendBeacon) {
      navigator.sendBeacon(ENDPOINT, body)
    } else {
      void fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      })
    }
  } catch {
    // Reporting must never throw.
  }
}
