/**
 * `buildMetadata` — a single helper for producing a Next.js 15 `Metadata`
 * object with a correct absolute canonical, OpenGraph, and Twitter card.
 *
 * Usage in a route:
 *
 *   export const metadata = buildMetadata({
 *     title: "Weight & Metabolic Health",
 *     description: "…",
 *     path: "/us/weight-metabolic-health",
 *   })
 *
 * or from `generateMetadata` for dynamic routes.
 *
 * Title convention: pass the keyword/phrase only (e.g. "Semaglutide Program").
 * The root layout applies the `%s | Saludlink` template for the <title> tag;
 * for OG/Twitter (which don't use templates) we build the full title here.
 */
import type { Metadata } from "next"
import { getBaseURL } from "@lib/util/env"
import { brand } from "@saludlink/ui"

const DEFAULT_DESCRIPTION =
  "Saludlink pairs clinician-informed weight & metabolic health products with connected telehealth care. Evidence-based, transparently priced, shipped to your door."

const DEFAULT_OG_IMAGE = "/opengraph-image.jpg"

export interface BuildMetadataInput {
  /** Keyword/phrase only — "| Saludlink" is appended for you. */
  title?: string
  description?: string
  /**
   * Path relative to the site root, e.g. "/us/products/foo". Used for the
   * absolute canonical URL. Defaults to "/".
   */
  path?: string
  /** Absolute or root-relative image URL. Defaults to the site OG image. */
  image?: string
  /** OpenGraph type. "website" (default) or "article". */
  type?: "website" | "article"
  /** When true, emits noindex/nofollow (e.g. thank-you / gated pages). */
  noindex?: boolean
}

function absoluteUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl
  const origin = getBaseURL().replace(/\/$/, "")
  return `${origin}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`
}

export function buildMetadata(input: BuildMetadataInput = {}): Metadata {
  const {
    title,
    description = DEFAULT_DESCRIPTION,
    path = "/",
    image = DEFAULT_OG_IMAGE,
    type = "website",
    noindex = false,
  } = input

  const canonical = absoluteUrl(path)
  const fullTitle = title ? `${title} | ${brand.name}` : brand.name
  const ogImage = absoluteUrl(image)

  return {
    // Bare keyword — root layout's `%s | Saludlink` template completes it.
    // When no title is supplied, fall back to the layout default.
    ...(title ? { title } : {}),
    description,
    alternates: {
      canonical,
    },
    robots: noindex
      ? { index: false, follow: false }
      : { index: true, follow: true },
    openGraph: {
      type,
      siteName: brand.name,
      title: fullTitle,
      description,
      url: canonical,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: fullTitle,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [ogImage],
    },
  }
}

export default buildMetadata
