/**
 * Saludlink site configuration — single source of truth for navigation, condition
 * verticals, and the LegitScript trust-footer link stack. Consumed by the header,
 * footer, and (where applicable) sitemap. Condition-first IA per the competitive
 * research (LifeMD/Everlywell/Noom all navigate by health category, not shop-vs-services).
 */

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
  telemedicineUrl:
    process.env.NEXT_PUBLIC_TELEMEDICINE_URL ||
    "https://care.saludlinkusa.com?utm_source=storefront&utm_medium=cta",
} as const

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
