import type { MetadataRoute } from "next"
import { getBaseURL } from "@lib/util/env"

/**
 * XML sitemap for saludlinkusa.com.
 *
 * Design goals:
 *  - Never throw. If a backend (Medusa) or CMS is unreachable, we still emit a
 *    valid sitemap of the known static routes. Dynamic sections degrade to [].
 *  - Everything is generated for the primary market country code below. When
 *    additional locales/markets launch, expand `COUNTRY_CODES` and map over it.
 *
 * NOTE ON URL SHAPE: routes live under `/[countryCode]/(main)/…`, so public
 * URLs are prefixed with the country code (e.g. `/us/store`). The `(main)`
 * segment is a route group and does NOT appear in the URL.
 */

const origin = () => getBaseURL().replace(/\/$/, "")

// Primary market. Add more codes here as markets go live.
const DEFAULT_COUNTRY = "us"

/**
 * Static routes, expressed WITHOUT the country prefix. Keep this list in sync
 * with the actual marketing/legal/telemedicine pages as they ship. Anything
 * not yet built should be commented out rather than emitted (a sitemap URL
 * that 404s hurts crawl trust).
 */
type StaticRoute = {
  path: string
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]
  priority: number
}

const STATIC_ROUTES: StaticRoute[] = [
  // Marketing
  { path: "", changeFrequency: "daily", priority: 1.0 },
  { path: "/store", changeFrequency: "daily", priority: 0.9 },
  { path: "/weight-metabolic-health", changeFrequency: "weekly", priority: 0.9 },
  { path: "/how-it-works", changeFrequency: "monthly", priority: 0.7 },
  { path: "/about", changeFrequency: "monthly", priority: 0.6 },
  { path: "/faq", changeFrequency: "monthly", priority: 0.6 },
  { path: "/contact", changeFrequency: "yearly", priority: 0.4 },
  // Telemedicine
  { path: "/telehealth", changeFrequency: "weekly", priority: 0.8 },
  { path: "/how-it-works/consultation", changeFrequency: "monthly", priority: 0.6 },
  // Legal / compliance
  { path: "/privacy-policy", changeFrequency: "yearly", priority: 0.3 },
  { path: "/terms", changeFrequency: "yearly", priority: 0.3 },
  { path: "/shipping-returns", changeFrequency: "yearly", priority: 0.3 },
  { path: "/telehealth-consent", changeFrequency: "yearly", priority: 0.3 },
  { path: "/hipaa-notice", changeFrequency: "yearly", priority: 0.3 },
]

function url(country: string, path: string): string {
  return `${origin()}/${country}${path}`
}

/**
 * TODO(products): fetch published product handles from Medusa and append them.
 * Replace this stub with a real `listProducts` call (see
 * `@lib/data/products`). Must catch its own errors and return [] on failure so
 * the sitemap never throws.
 *
 * Expected shape once implemented:
 *   `${origin}/${country}/products/${handle}`
 */
async function getProductEntries(
  country: string
): Promise<MetadataRoute.Sitemap> {
  try {
    // const { response } = await listProducts({
    //   countryCode: country,
    //   queryParams: { limit: 1000, fields: "handle,updated_at" },
    // })
    // return response.products
    //   .filter((p) => p.handle)
    //   .map((p) => ({
    //     url: url(country, `/products/${p.handle}`),
    //     lastModified: p.updated_at ? new Date(p.updated_at) : undefined,
    //     changeFrequency: "weekly",
    //     priority: 0.8,
    //   }))
    return []
  } catch (error) {
    console.error("sitemap: failed to load product entries", error)
    return []
  }
}

/**
 * TODO(cms): fetch published blog/education post slugs from the CMS and append
 * them. Replace this stub with the real CMS client call. Health articles should
 * carry `lastModified` so freshness is signalled to crawlers.
 *
 * Expected shape once implemented:
 *   `${origin}/${country}/learn/${slug}`
 */
async function getPostEntries(country: string): Promise<MetadataRoute.Sitemap> {
  try {
    // const posts = await getPublishedPosts()
    // return posts.map((post) => ({
    //   url: url(country, `/learn/${post.slug}`),
    //   lastModified: post.updatedAt ? new Date(post.updatedAt) : undefined,
    //   changeFrequency: "monthly",
    //   priority: 0.7,
    // }))
    return []
  } catch (error) {
    console.error("sitemap: failed to load CMS post entries", error)
    return []
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()
  const countries = [DEFAULT_COUNTRY]

  const staticEntries: MetadataRoute.Sitemap = countries.flatMap((country) =>
    STATIC_ROUTES.map((route) => ({
      url: url(country, route.path),
      lastModified: now,
      changeFrequency: route.changeFrequency,
      priority: route.priority,
    }))
  )

  // Dynamic sections — each degrades to [] on error, so the sitemap is always
  // valid even if the backend/CMS is down.
  const dynamicEntries: MetadataRoute.Sitemap = (
    await Promise.all(
      countries.flatMap((country) => [
        getProductEntries(country),
        getPostEntries(country),
      ])
    )
  ).flat()

  return [...staticEntries, ...dynamicEntries]
}
