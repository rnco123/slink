/**
 * Saludlink site configuration — single source of truth for navigation, condition
 * verticals, and the LegitScript trust-footer link stack. Consumed by the header,
 * footer, and (where applicable) sitemap. Condition-first IA per the competitive
 * research (LifeMD/Everlywell/Noom all navigate by health category, not shop-vs-services).
 */

/**
 * Base URL of the external telehealth portal — NO UTM params here; per-placement
 * campaign tags are added by `telemedicineUrl(placement)` below. CTAs must link
 * out via that function so `care.` can attribute which placement converts.
 */
const TELEMEDICINE_BASE_URL =
  process.env.NEXT_PUBLIC_TELEMEDICINE_URL || "https://care.saludlinkusa.com"

export const siteConfig = {
  name: "Saludlink",
  legalEntity: "Saludlink, Inc.",
  domain: "saludlinkusa.com",
  url: "https://www.saludlinkusa.com",
  tagline: "Metabolic health, thoughtfully delivered.",
  // TODO: replace with the real registered contact details for LegitScript
  contact: {
    addressLine: "[123 Example St, Suite 100]",
    city: "[City]",
    state: "[ST]",
    zip: "[00000]",
    phone: "[1-800-000-0000]",
    email: "support@saludlinkusa.com",
    hours: "Mon–Fri, 9am–6pm ET",
  },
  /** Untagged portal base — prefer `telemedicineUrl(placement)` for CTA links. */
  telemedicineUrl: TELEMEDICINE_BASE_URL,
} as const

/**
 * CTA placements that link out to the telehealth portal. Each maps to a distinct
 * `utm_content` so the portal's analytics can break down storefront→portal
 * traffic by where the click came from (task 65 §3b).
 */
export type TelemedicinePlacement =
  | "nav"
  | "mobile-menu"
  | "home-section"
  | "telemedicine-page"

/**
 * Build the outbound telehealth-portal URL for a given CTA placement, tagged with
 * a consistent UTM convention (source=storefront, medium=cta,
 * campaign=telehealth-linkout, content=<placement>). No PHI/ids cross over — UTM
 * params are campaign metadata only. Any query already on the base URL is kept,
 * with our UTM params taking precedence.
 */
export function telemedicineUrl(placement: TelemedicinePlacement): string {
  try {
    const u = new URL(TELEMEDICINE_BASE_URL)
    u.searchParams.set("utm_source", "storefront")
    u.searchParams.set("utm_medium", "cta")
    u.searchParams.set("utm_campaign", "telehealth-linkout")
    u.searchParams.set("utm_content", placement)
    return u.toString()
  } catch {
    // Malformed override env — fall back to the untagged base rather than throw.
    return TELEMEDICINE_BASE_URL
  }
}

/** Lead vertical: weight & metabolic health. Drives condition-hub nav + SEO structure. */
export const conditionVerticals = [
  {
    slug: "weight-management",
    label: "Weight Management",
    blurb: "Evidence-informed support for sustainable weight change.",
  },
  {
    slug: "metabolic-health",
    label: "Metabolic Health",
    blurb: "Blood sugar, energy, and metabolic markers.",
  },
  {
    slug: "nutrition",
    label: "Nutrition & Meal Support",
    blurb: "Protein, fiber, and daily nutritional foundations.",
  },
  {
    slug: "monitoring",
    label: "Monitoring & Devices",
    blurb: "Scales, monitors, and at-home tracking tools.",
  },
] as const

export const primaryNav = [
  { label: "Shop", href: "/store" },
  { label: "Conditions", href: "/conditions" },
  { label: "Telehealth", href: "/telemedicine" },
  { label: "Learn", href: "/learn" },
  { label: "About", href: "/about" },
] as const

/** LegitScript-required trust stack — enumerated so footer + sitemap stay in sync. */
export const legalLinks = [
  { slug: "privacy-policy", label: "Privacy Policy" },
  { slug: "notice-of-privacy-practices", label: "Notice of Privacy Practices" },
  { slug: "terms-of-service", label: "Terms of Service" },
  { slug: "telehealth-consent", label: "Telehealth Consent" },
  { slug: "refund-policy", label: "Refund Policy" },
  { slug: "shipping-policy", label: "Shipping Policy" },
  { slug: "medical-disclaimer", label: "Medical Disclaimer" },
  { slug: "accessibility", label: "Accessibility" },
  { slug: "editorial-policy", label: "Editorial Policy" },
  { slug: "nondiscrimination", label: "Nondiscrimination" },
] as const

export const companyLinks = [
  { label: "About Saludlink", href: "/about" },
  { label: "Contact", href: "/contact" },
  { label: "Licensing & State Availability", href: "/licensing" },
  { label: "Editorial Policy", href: "/legal/editorial-policy" },
] as const
