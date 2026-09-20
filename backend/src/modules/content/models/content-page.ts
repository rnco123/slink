import { model } from "@medusajs/framework/utils"

/**
 * ContentPage — editable legal/policy and generic marketing pages (the mini-CMS).
 * One row per (slug, locale) so English and Spanish are managed independently.
 * The storefront reads published pages by slug + locale via the store API.
 */
const ContentPage = model
  .define("content_page", {
    id: model.id().primaryKey(),
    slug: model.text(), // e.g. "privacy-policy"
    locale: model.text(), // "en" | "es"
    type: model.text().default("legal"), // "legal" | "page"
    title: model.text(),
    body: model.text(), // markdown/rich text
    excerpt: model.text().nullable(),
    seo_title: model.text().nullable(),
    seo_description: model.text().nullable(),
    status: model.text().default("published"), // "draft" | "published"
    last_updated: model.text().nullable(), // human display date, e.g. "2026-07-22"
  })
  .indexes([{ on: ["slug", "locale"], unique: true }])

export default ContentPage
