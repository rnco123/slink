import { model } from "@medusajs/framework/utils"

/**
 * ProductReview — customer product review (roadmap task 21b).
 *
 * Medusa v2 has no built-in reviews, so this is a custom module. Reviews are
 * moderated: every submission lands as `pending` and only becomes visible on the
 * storefront once an admin sets it to `approved`. This moderation gate is a
 * COMPLIANCE requirement, not a nicety — an unmoderated health-product review
 * can make a disease/treatment claim that puts LegitScript certification and FTC
 * standing at risk, so nothing user-authored reaches the public PDP unreviewed.
 *
 * PHI boundary: reviews are product feedback, never clinical data. `display_name`
 * is a user-chosen label (default "Verified Customer"); we never render the
 * customer's real name or email. Free-text (`title`/`content`) is passed through
 * @saludlink/privacy before any analytics/logging (see the store route).
 *
 * `product_id` is stored as plain text (not a formal module link) — the store
 * read path filters by it directly, which keeps the module self-contained. A
 * formal product↔review link is a future enhancement for `query.graph` joins.
 */
const ProductReview = model
  .define("product_review", {
    id: model.id().primaryKey(),
    // The reviewed product (Medusa product id, e.g. "prod_...").
    product_id: model.text(),
    // The authenticated customer who wrote it (null if ever seeded/anonymized).
    customer_id: model.text().nullable(),
    // Public display label — NEVER the customer's real name/email.
    display_name: model.text().default("Verified Customer"),
    // 1–5, enforced at the API layer.
    rating: model.number(),
    title: model.text().nullable(),
    content: model.text(),
    // True when the customer's orders contain this product (computed at submit).
    verified_purchase: model.boolean().default(false),
    // Moderation state: "pending" | "approved" | "rejected".
    status: model.text().default("pending"),
    // Admin user id + timestamp of the moderation decision.
    moderated_by: model.text().nullable(),
    moderated_at: model.text().nullable(),
  })
  // Fast lookups for the public "approved reviews for product X" read path and
  // the admin "pending queue" filter.
  .indexes([{ on: ["product_id", "status"] }, { on: ["status"] }])

export default ProductReview
