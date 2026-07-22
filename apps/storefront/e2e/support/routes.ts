/**
 * Route + content contract for the e2e suite.
 *
 * These lists intentionally MIRROR (rather than import) the values in
 * `src/lib/config/site.ts` and the app router tree. Keeping an independent copy
 * turns the suite into a contract: if a route is removed or a slug is renamed
 * without updating both places, a test fails — which is what we want.
 */

export const LOCALES = ["en", "es"] as const
export type Locale = (typeof LOCALES)[number]
export const DEFAULT_LOCALE: Locale = "en"

/** Build a locale-prefixed path, e.g. path("/about", "es") -> "/es/about". */
export function path(p: string, locale: Locale = DEFAULT_LOCALE): string {
  const clean = p === "/" ? "" : p.startsWith("/") ? p : `/${p}`
  return `/${locale}${clean}`
}

/** Condition verticals — hub cards + /conditions/[slug] pages. */
export const CONDITION_SLUGS = [
  "weight-management",
  "metabolic-health",
  "nutrition",
  "monitoring",
] as const

/** LegitScript trust-stack legal pages under /legal/[slug]. */
export const LEGAL_SLUGS = [
  "privacy-policy",
  "notice-of-privacy-practices",
  "terms-of-service",
  "telehealth-consent",
  "refund-policy",
  "shipping-policy",
  "medical-disclaimer",
  "accessibility",
  "editorial-policy",
  "nondiscrimination",
] as const

/**
 * Every marketing / informational route that renders WITHOUT a Medusa backend
 * (anonymous session). Expressed without the locale prefix.
 *
 * NOTE: /legal/<slug> is intentionally NOT here — those pages now pull their
 * content from the Medusa content module and 404 without a seeded backend, so
 * they're covered under the @commerce-gated legal.spec.ts instead.
 */
export const CONTENT_ROUTES: string[] = [
  "/",
  "/about",
  "/contact",
  "/licensing",
  "/telemedicine",
  "/conditions",
  ...CONDITION_SLUGS.map((s) => `/conditions/${s}`),
]

/** Header primary navigation (matches nav/index.tsx). */
export const PRIMARY_NAV = [
  { label: "Shop", href: "/store" },
  { label: "Conditions", href: "/conditions" },
  { label: "Telehealth", href: "/telemedicine" },
  { label: "Learn", href: "/learn" },
  { label: "About", href: "/about" },
] as const

/** Footer company links (matches site.ts companyLinks). */
export const COMPANY_LINKS = [
  { label: "About Saludlink", href: "/about" },
  { label: "Contact", href: "/contact" },
  { label: "Licensing & State Availability", href: "/licensing" },
  { label: "Editorial Policy", href: "/legal/editorial-policy" },
] as const

/**
 * Commerce routes needing a seeded Medusa backend (specs tagged @commerce).
 */
export const COMMERCE_ROUTES: string[] = ["/store", "/cart", "/account"]
