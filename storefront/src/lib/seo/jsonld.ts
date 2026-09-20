/**
 * Typed JSON-LD builders for Saludlink structured data.
 *
 * These return plain, serializable objects (`Record<string, any>`) that are
 * rendered via the `<JsonLd />` component in `./JsonLd.tsx`:
 *
 *   <JsonLd data={organizationJsonLd()} />
 *
 * We intentionally avoid `schema-dts` types so this file has zero external
 * type dependencies and always typechecks. All URLs are absolute (Google
 * requires absolute URLs in structured data).
 *
 * Health copy note (LegitScript / FTC): descriptions here MUST stay factual
 * and avoid unsupported medical/treatment claims. Keep it descriptive of the
 * service, not of outcomes.
 */
import { getBaseURL } from "@lib/util/env"
import { brand } from "@saludlink/ui"

type JsonLdObject = Record<string, any>

const base = () => getBaseURL().replace(/\/$/, "")

/** Stable @id anchors so nodes can cross-reference each other. */
export const ORGANIZATION_ID = () => `${base()}/#organization`
export const WEBSITE_ID = () => `${base()}/#website`

/**
 * Organization + MedicalOrganization node. Establishes the brand entity and
 * E-E-A-T "who we are" signal. `sameAs` is an empty placeholder — populate
 * with verified social/authority profiles as they go live.
 */
export function organizationJsonLd(): JsonLdObject {
  const url = base()
  return {
    "@context": "https://schema.org",
    "@type": ["Organization", "MedicalOrganization"],
    "@id": ORGANIZATION_ID(),
    name: brand.name,
    legalName: brand.legalEntity,
    url,
    logo: {
      "@type": "ImageObject",
      url: `${url}/brand/saludlink-mark.svg`,
    },
    image: `${url}/opengraph-image.jpg`,
    description:
      "Saludlink pairs clinician-informed weight & metabolic health products with connected telehealth care, transparently priced and shipped to your door.",
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      email: `support@${brand.domain}`,
      availableLanguage: ["en", "es"],
    },
    // Placeholder — add verified profile URLs (LinkedIn, Instagram, etc.).
    sameAs: [] as string[],
    medicalSpecialty: ["Endocrine", "DietNutrition", "PrimaryCare"],
  }
}

/**
 * WebSite node with a Sitelinks SearchAction so Google can surface an in-SERP
 * search box. Target points at the storefront search route.
 */
export function websiteJsonLd(): JsonLdObject {
  const url = base()
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": WEBSITE_ID(),
    name: brand.name,
    url,
    publisher: { "@id": ORGANIZATION_ID() },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${url}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  }
}

export type ProductAvailability =
  | "InStock"
  | "OutOfStock"
  | "PreOrder"
  | "BackOrder"
  | "Discontinued"

export interface ProductJsonLdInput {
  name: string
  description: string
  /** One or more absolute (or root-relative) image URLs. */
  image: string | string[]
  price: number | string
  currency: string
  sku?: string
  availability?: ProductAvailability
  ratingValue?: number
  reviewCount?: number
  /**
   * Individual approved reviews to emit as schema.org `Review` nodes. Only
   * moderation-approved reviews should ever be passed here (see task 21b).
   */
  reviews?: ProductReviewJsonLd[]
  /** Brand name for the product; defaults to the Saludlink brand. */
  brand?: string
  /** Absolute canonical URL of the product page (defaults to base). */
  url?: string
  /**
   * US state / territory codes (e.g. "US-CA", "US-NY" or "CA", "NY") this
   * product can ship to. Mirrors Everlywell's state-level shipping eligibility
   * so ineligible states are excluded from Shopping/rich results.
   */
  shippingStates?: string[]
}

export interface ProductReviewJsonLd {
  author: string
  rating: number
  title?: string | null
  body: string
  /** ISO 8601 date string. */
  datePublished?: string
}

function toAbsolute(url: string): string {
  if (/^https?:\/\//i.test(url)) return url
  return `${base()}${url.startsWith("/") ? "" : "/"}${url}`
}

/**
 * Full Product node with an Offer, optional AggregateRating, a
 * MerchantReturnPolicy and OfferShippingDetails (state-level DefinedRegion).
 */
export function productJsonLd(input: ProductJsonLdInput): JsonLdObject {
  const {
    name,
    description,
    image,
    price,
    currency,
    sku,
    availability = "InStock",
    ratingValue,
    reviewCount,
    reviews,
    brand: productBrand = brand.name,
    url,
    shippingStates,
  } = input

  const images = (Array.isArray(image) ? image : [image]).map(toAbsolute)

  const shippingDestination: JsonLdObject = {
    "@type": "DefinedRegion",
    addressCountry: "US",
  }
  if (shippingStates && shippingStates.length > 0) {
    // Normalize to bare state codes ("US-CA" -> "CA") for addressRegion.
    shippingDestination.addressRegion = shippingStates.map((s) =>
      s.replace(/^US-/i, "").toUpperCase()
    )
  }

  const offer: JsonLdObject = {
    "@type": "Offer",
    url: url ? toAbsolute(url) : base(),
    priceCurrency: currency,
    price: typeof price === "number" ? price.toFixed(2) : price,
    availability: `https://schema.org/${availability}`,
    itemCondition: "https://schema.org/NewCondition",
    seller: { "@id": ORGANIZATION_ID() },
    hasMerchantReturnPolicy: {
      "@type": "MerchantReturnPolicy",
      applicableCountry: "US",
      returnPolicyCategory:
        "https://schema.org/MerchantReturnFiniteReturnWindow",
      merchantReturnDays: 30,
      returnMethod: "https://schema.org/ReturnByMail",
      returnFees: "https://schema.org/FreeReturn",
    },
    shippingDetails: {
      "@type": "OfferShippingDetails",
      shippingRate: {
        "@type": "MonetaryAmount",
        value: "0",
        currency,
      },
      shippingDestination,
      deliveryTime: {
        "@type": "ShippingDeliveryTime",
        handlingTime: {
          "@type": "QuantitativeValue",
          minValue: 0,
          maxValue: 2,
          unitCode: "DAY",
        },
        transitTime: {
          "@type": "QuantitativeValue",
          minValue: 2,
          maxValue: 5,
          unitCode: "DAY",
        },
      },
    },
  }

  const data: JsonLdObject = {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    description,
    image: images,
    brand: { "@type": "Brand", name: productBrand },
    offers: offer,
  }

  if (sku) {
    data.sku = sku
    offer.sku = sku
  }

  if (
    typeof ratingValue === "number" &&
    typeof reviewCount === "number" &&
    reviewCount > 0
  ) {
    data.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: ratingValue.toFixed(1),
      reviewCount,
      bestRating: "5",
      worstRating: "1",
    }
  }

  if (reviews && reviews.length > 0) {
    data.review = reviews.map((r) => {
      const node: JsonLdObject = {
        "@type": "Review",
        reviewRating: {
          "@type": "Rating",
          ratingValue: String(r.rating),
          bestRating: "5",
          worstRating: "1",
        },
        author: { "@type": "Person", name: r.author },
        reviewBody: r.body,
      }
      if (r.title) node.name = r.title
      if (r.datePublished) node.datePublished = r.datePublished
      return node
    })
  }

  return data
}

export interface BreadcrumbItem {
  name: string
  url: string
}

/** BreadcrumbList — pass items in order from root to current page. */
export function breadcrumbJsonLd(items: BreadcrumbItem[]): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: toAbsolute(item.url),
    })),
  }
}

export interface FaqItem {
  question: string
  answer: string
}

/** FAQPage — answers should be plain text (HTML is allowed but keep it simple). */
export function faqJsonLd(items: readonly FaqItem[]): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  }
}

export interface ArticleJsonLdInput {
  title: string
  description: string
  url: string
  image: string | string[]
  /** ISO 8601 date string. */
  datePublished: string
  /** ISO 8601 date string; defaults to datePublished. */
  dateModified?: string
  authorName: string
  /** Medical reviewer name — the core E-E-A-T signal for health content. */
  reviewerName?: string
  /** Reviewer credential, e.g. "MD", "PharmD", "RD, LDN". */
  reviewerCredential?: string
}

/**
 * Article + MedicalWebPage node for health/editorial content. Carries both an
 * `author` (Person) and a `reviewedBy` medical reviewer (Person) — the
 * experience/expertise/authoritativeness/trust signals Google's health quality
 * guidelines look for.
 */
export function articleJsonLd(input: ArticleJsonLdInput): JsonLdObject {
  const {
    title,
    description,
    url,
    image,
    datePublished,
    dateModified,
    authorName,
    reviewerName,
    reviewerCredential,
  } = input

  const images = (Array.isArray(image) ? image : [image]).map(toAbsolute)
  const absoluteUrl = toAbsolute(url)

  const data: JsonLdObject = {
    "@context": "https://schema.org",
    "@type": ["Article", "MedicalWebPage"],
    headline: title,
    description,
    image: images,
    url: absoluteUrl,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": absoluteUrl,
    },
    datePublished,
    dateModified: dateModified ?? datePublished,
    author: {
      "@type": "Person",
      name: authorName,
    },
    publisher: { "@id": ORGANIZATION_ID() },
    isPartOf: { "@id": WEBSITE_ID() },
  }

  if (reviewerName) {
    const reviewer: JsonLdObject = {
      "@type": "Person",
      name: reviewerName,
    }
    if (reviewerCredential) {
      reviewer.honorificSuffix = reviewerCredential
      reviewer.hasCredential = {
        "@type": "EducationalOccupationalCredential",
        credentialCategory: reviewerCredential,
      }
    }
    data.reviewedBy = reviewer
    // MedicalWebPage-specific: signals the content was clinically reviewed.
    data.lastReviewed = dateModified ?? datePublished
  }

  return data
}

// Re-export the renderer so consumers can import builders + component from one path.
export { JsonLd } from "./ld-script"
