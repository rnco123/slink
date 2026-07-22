/** The canonical production origin. Route53 zone `saludlinkusa.com` is ours. */
const PRODUCTION_ORIGIN = "https://saludlinkusa.com"
/** Local dev origin (storefront runs on :8000). */
const DEVELOPMENT_ORIGIN = "http://localhost:8000"

/**
 * Absolute site origin — the source of truth for canonical URLs, hreflang,
 * `sitemap.xml`, `robots.txt` and OpenGraph tags.
 *
 * Driven by `NEXT_PUBLIC_BASE_URL` per environment. The fallback is
 * environment-aware so a missing env var never leaks `localhost` into
 * production robots.txt/sitemap/canonicals (roadmap task 56). Env validation at
 * boot (task 74) should assert this is set for real deploys.
 */
export const getBaseURL = () => {
  const configured = process.env.NEXT_PUBLIC_BASE_URL?.trim()
  if (configured) {
    return configured
  }
  return process.env.NODE_ENV === "production"
    ? PRODUCTION_ORIGIN
    : DEVELOPMENT_ORIGIN
}
