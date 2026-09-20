/**
 * Next.js instrumentation hook (roadmap task 74).
 * -------------------------------------------------------------------------
 * `register()` runs ONCE when the server process starts (before any request is
 * handled), on both the Node and Edge runtimes. We use it to validate the
 * environment at boot so a misconfigured deploy fails fast with the offending
 * variable named — see `src/lib/env.ts`.
 *
 * The env validation only runs on the Node.js runtime: the Edge runtime lacks
 * full `process.env`, and the server-side secrets we gate on (REVALIDATE_SECRET)
 * are never present there anyway.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { validateStorefrontEnv } = await import("./lib/env")
    validateStorefrontEnv()
  }
}
