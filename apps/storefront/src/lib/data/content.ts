import "server-only"
import { sdk } from "@lib/config"

/**
 * Storefront readers for the Saludlink mini-CMS (Medusa content module).
 * All fail safe — return null/[] if the backend is unavailable so pages can fall back to
 * built-in copy and never hard-crash on a CMS outage.
 */

export type CmsPage = {
  id: string
  slug: string
  locale: string
  title: string
  body: string
  last_updated?: string | null
  seo_title?: string | null
  seo_description?: string | null
}

export type CmsArticle = {
  id: string
  slug: string
  locale: string
  title: string
  excerpt?: string | null
  body: string
  category?: string | null
  author_name?: string | null
  reviewer_name?: string | null
  reviewer_credentials?: string | null
  reviewed_at?: string | null
  published_at?: string | null
}

export async function getContentPage(
  slug: string,
  locale: string
): Promise<CmsPage | null> {
  try {
    const { page } = await sdk.client.fetch<{ page: CmsPage }>(
      `/store/content/pages/${slug}`,
      { query: { locale }, cache: "no-store" }
    )
    return page ?? null
  } catch {
    return null
  }
}

export async function listArticles(locale: string): Promise<CmsArticle[]> {
  try {
    const { articles } = await sdk.client.fetch<{ articles: CmsArticle[] }>(
      `/store/content/articles`,
      { query: { locale }, cache: "no-store" }
    )
    return articles ?? []
  } catch {
    return []
  }
}

export async function getArticle(
  slug: string,
  locale: string
): Promise<CmsArticle | null> {
  try {
    const { article } = await sdk.client.fetch<{ article: CmsArticle }>(
      `/store/content/articles/${slug}`,
      { query: { locale }, cache: "no-store" }
    )
    return article ?? null
  } catch {
    return null
  }
}

export async function getSiteSettings(): Promise<Record<string, any>> {
  try {
    const { settings } = await sdk.client.fetch<{
      settings: Record<string, any>
    }>(`/store/content/settings`, { cache: "no-store" })
    return settings ?? {}
  } catch {
    return {}
  }
}
