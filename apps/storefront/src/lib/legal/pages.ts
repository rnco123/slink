/**
 * Registry of Saludlink legal / trust pages.
 *
 * Single source of truth for the sitemap, the footer trust stack, and each
 * legal route's metadata. Every document listed here has a matching route at
 * `src/app/[countryCode]/(main)/legal/{slug}/page.tsx`.
 *
 * These documents are REQUIRED for LegitScript healthcare merchant
 * certification (see docs/legitweb-rules.md — "footer trust stack").
 */

export type LegalPageSlug =
  | "privacy-policy"
  | "notice-of-privacy-practices"
  | "terms-of-service"
  | "telehealth-consent"
  | "refund-policy"
  | "shipping-policy"
  | "medical-disclaimer"
  | "accessibility"
  | "editorial-policy"
  | "nondiscrimination"

export interface LegalPage {
  /** URL slug, used at /legal/{slug} */
  slug: LegalPageSlug
  /** Human title, used in headings, footer links, and <title>. */
  title: string
  /** Short meta description for SEO / social. */
  description: string
  /**
   * Last substantive revision date, ISO 8601 (YYYY-MM-DD).
   * Update whenever the document copy materially changes.
   */
  lastUpdated: string
}

/**
 * All legal pages, in the order they should appear in the footer trust stack.
 */
export const LEGAL_PAGES: LegalPage[] = [
  {
    slug: "privacy-policy",
    title: "Privacy Policy",
    description:
      "How Saludlink collects, uses, shares, and protects information from visitors to saludlinkusa.com, and the privacy choices available to you.",
    lastUpdated: "2026-07-22",
  },
  {
    slug: "notice-of-privacy-practices",
    title: "Notice of Privacy Practices",
    description:
      "Our HIPAA Notice of Privacy Practices describing how protected health information may be used and disclosed and how you can access it.",
    lastUpdated: "2026-07-22",
  },
  {
    slug: "terms-of-service",
    title: "Terms of Service",
    description:
      "The terms and conditions that govern your use of the Saludlink website, products, and services.",
    lastUpdated: "2026-07-22",
  },
  {
    slug: "telehealth-consent",
    title: "Telehealth Informed Consent",
    description:
      "Informed consent to receive telehealth services, including the nature, benefits, and limitations of care delivered remotely.",
    lastUpdated: "2026-07-22",
  },
  {
    slug: "refund-policy",
    title: "Refund & Return Policy",
    description:
      "Return windows, eligibility, non-returnable items, and how and when refunds are issued for Saludlink orders.",
    lastUpdated: "2026-07-22",
  },
  {
    slug: "shipping-policy",
    title: "Shipping Policy",
    description:
      "Order processing times, carriers, shipping regions, delivery estimates, and shipping costs for Saludlink orders.",
    lastUpdated: "2026-07-22",
  },
  {
    slug: "medical-disclaimer",
    title: "Medical Disclaimer",
    description:
      "Information provided by Saludlink is for educational purposes only and is not a substitute for professional medical advice, diagnosis, or treatment.",
    lastUpdated: "2026-07-22",
  },
  {
    slug: "accessibility",
    title: "Accessibility Statement",
    description:
      "Saludlink's commitment to WCAG 2.1 Level AA accessibility and how to reach us about accessibility barriers.",
    lastUpdated: "2026-07-22",
  },
  {
    slug: "editorial-policy",
    title: "Editorial Policy",
    description:
      "How Saludlink health content is researched, written, sourced, and medically reviewed for accuracy.",
    lastUpdated: "2026-07-22",
  },
  {
    slug: "nondiscrimination",
    title: "Nondiscrimination & Language Assistance",
    description:
      "Saludlink does not discriminate on the basis of protected characteristics and provides free language assistance services.",
    lastUpdated: "2026-07-22",
  },
]

/**
 * Look up a single legal page by slug. Returns `undefined` if not found.
 */
export function getLegalPage(slug: string): LegalPage | undefined {
  return LEGAL_PAGES.find((page) => page.slug === slug)
}

/**
 * All legal slugs, convenient for `generateStaticParams` and sitemap loops.
 */
export function getLegalPageSlugs(): LegalPageSlug[] {
  return LEGAL_PAGES.map((page) => page.slug)
}
