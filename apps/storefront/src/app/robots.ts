import type { MetadataRoute } from "next"
import { getBaseURL } from "@lib/util/env"
import { isComingSoonEnabled } from "@lib/preview"

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

  // While the coming-soon wall is up, keep the whole site out of the index
  // (task 82). Search Console submission (task 64) resumes once the wall drops.
  if (isComingSoonEnabled()) {
    return {
      rules: [{ userAgent: "*", disallow: "/" }],
      host: origin,
    }
  }

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
