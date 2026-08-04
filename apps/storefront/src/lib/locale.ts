/**
 * The routing locale — the first path segment of every storefront URL.
 *
 * NOTE ON NAMING: the App Router segment is called `[countryCode]` because this
 * app descends from the Medusa starter, where that segment really was a country
 * (`/us/…`, `/mx/…`). Saludlink is US-only but bilingual, so the segment carries
 * the LANGUAGE instead (`/en/…`, `/es/…`) and the commerce region is resolved to
 * US server-side. Anything that builds a URL from an address/region country code
 * produces a dead path like `/us/checkout` — see `getRoutingLocale()`.
 *
 * Deliberately dependency-free: `middleware.ts` imports this, and middleware runs
 * on the edge runtime where server-only modules (`next/headers`) are unavailable.
 */

export const LOCALES = ["en", "es"] as const

export type Locale = (typeof LOCALES)[number]

export const DEFAULT_LOCALE: Locale = "en"

/** Cookie the middleware writes so the language choice survives navigation. */
export const LOCALE_COOKIE = "NEXT_LOCALE"

/** Request header the middleware sets so server code can read the active locale. */
export const LOCALE_HEADER = "x-locale"

export function isLocale(v: string | null | undefined): v is Locale {
  return !!v && (LOCALES as readonly string[]).includes(v)
}
