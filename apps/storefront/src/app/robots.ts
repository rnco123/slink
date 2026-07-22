import type { MetadataRoute } from "next"
import { getBaseURL } from "@lib/util/env"

/**
 * robots.txt for saludlinkusa.com.
 *
 * Allow crawling of all public marketing/commerce/content pages. Block the
 * transactional + authenticated surfaces (no SEO value, and we don't want
 * PHI-adjacent or session URLs indexed). Routes are language prefixed
 * (like /en/cart or /es/checkout) so we disallow both the bare paths and the
 * wildcard-prefixed variants.
 */
export default function robots(): MetadataRoute.Robots {
  const origin = getBaseURL().replace(/\/$/, "")

  const disallow = [
    "/cart",
    "/checkout",
    "/account",
    "/admin",
    "/api",
    // Country-code-prefixed variants (e.g. /us/cart, /mx/checkout).
    "/*/cart",
    "/*/checkout",
    "/*/account",
  ]

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow,
      },
    ],
    sitemap: `${origin}/sitemap.xml`,
    host: origin,
  }
}
