import { model } from "@medusajs/framework/utils"

/**
 * Article — blog / health content with E-E-A-T fields (author + medical reviewer),
 * bilingual (one row per slug+locale). Read by the storefront learn center.
 */
const Article = model
  .define("content_article", {
    id: model.id().primaryKey(),
    slug: model.text(),
    locale: model.text(), // "en" | "es"
    title: model.text(),
    excerpt: model.text().nullable(),
    body: model.text(),
    hero_image: model.text().nullable(),
    author_name: model.text().nullable(),
    author_credentials: model.text().nullable(),
    reviewer_name: model.text().nullable(),
    reviewer_credentials: model.text().nullable(),
    reviewed_at: model.text().nullable(),
    category: model.text().nullable(),
    seo_title: model.text().nullable(),
    seo_description: model.text().nullable(),
    status: model.text().default("draft"), // "draft" | "published"
    published_at: model.text().nullable(),
  })
  .indexes([{ on: ["slug", "locale"], unique: true }])

export default Article
