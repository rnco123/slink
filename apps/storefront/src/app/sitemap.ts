import type { MetadataRoute } from "next"
import { getBaseURL } from "@lib/util/env"
import { locales } from "@lib/i18n/config"

/**
 * XML sitemap for saludlinkusa.com.
 *
 * Design goals:
 *  - Never throw. If a backend (Medusa) or CMS is unreachable, we still emit a
 *    valid sitemap of the known static routes. Dynamic sections degrade to [].
 *  - One entry per supported LANGUAGE. The URL's first path segment is the
 *    language (`/en/…`, `/es/…`) — distinct indexable URLs per language, which is
 *    the SEO-grade approach (see `lib/i18n/config`).
 *
 * NOTE ON URL SHAPE: routes live under `/[countryCode]/(main)/…`, so public
 * URLs are prefixed with the LANGUAGE code (e.g. `/en/store`). The `(main)`
 * segment is a route group and does NOT appear in the URL.
 */

const origin = () => getBaseURL().replace(/\/$/, "")

// Supported languages (the `[countryCode]` route segment is really the locale).
const LOCALES = locales

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
  // Marketing (must mirror app/[countryCode]/(main)/… routes that actually ship)
  { path: "", changeFrequency: "daily", priority: 1.0 },
  { path: "/store", changeFrequency: "daily", priority: 0.9 },
  { path: "/telemedicine", changeFrequency: "weekly", priority: 0.8 },
  { path: "/conditions", changeFrequency: "weekly", priority: 0.8 },
  { path: "/about", changeFrequency: "monthly", priority: 0.6 },
  { path: "/licensing", changeFrequency: "monthly", priority: 0.5 },
  { path: "/contact", changeFrequency: "yearly", priority: 0.4 },
  // Legal / compliance pages are CMS-driven (`/legal/[slug]`) and emitted
  // dynamically once the content DB is seeded — see getPostEntries / task 22.
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
  const countries = [...LOCALES]

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
