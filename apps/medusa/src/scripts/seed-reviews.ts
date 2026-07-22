import { Modules } from "@medusajs/framework/utils"
import { ExecArgs } from "@medusajs/framework/types"
import { PRODUCT_REVIEW_MODULE } from "../modules/product-review"
import type ProductReviewModuleService from "../modules/product-review/service"

/**
 * Seed demo product reviews (roadmap task 21b).
 * Run: npx medusa exec ./src/scripts/seed-reviews.ts
 *
 * Creates a mix of approved + pending reviews on the first product so the PDP
 * shows a star summary + review list, and the admin moderation queue has a
 * pending item to act on. Idempotent — skips if reviews already exist.
 */
export default async function seedReviews({ container }: ExecArgs) {
  const productModule = container.resolve(Modules.PRODUCT)
  const reviewService: ProductReviewModuleService = container.resolve(
    PRODUCT_REVIEW_MODULE
  )

  const products = await productModule.listProducts(
    {},
    { select: ["id", "title"], take: 1 }
  )
  if (!products.length) {
    console.log("No products found — run the catalog seed first. Skipping.")
    return
  }
  const product = products[0]!

  const existing = await reviewService.listProductReviews(
    { product_id: product.id },
    { take: 1 }
  )
  if (existing.length) {
    console.log(`Reviews already exist for "${product.title}" — skipping seed.`)
    return
  }

  await reviewService.createProductReviews([
    {
      product_id: product.id,
      customer_id: null,
      display_name: "María G.",
      rating: 5,
      title: "Easy to take, noticeable routine",
      content:
        "Simple to add to my morning routine and the packaging is clear. Shipping was quick.",
      verified_purchase: true,
      status: "approved",
      moderated_by: "seed",
      moderated_at: new Date().toISOString(),
    },
    {
      product_id: product.id,
      customer_id: null,
      display_name: "James T.",
      rating: 4,
      title: "Good value",
      content:
        "Fair price compared to what I found elsewhere. Would order again.",
      verified_purchase: true,
      status: "approved",
      moderated_by: "seed",
      moderated_at: new Date().toISOString(),
    },
    {
      product_id: product.id,
      customer_id: null,
      display_name: "Anonymous",
      rating: 3,
      title: "Awaiting moderation",
      content:
        "This one is intentionally left pending so the admin queue has an item to moderate.",
      verified_purchase: false,
      status: "pending",
    },
  ])

  console.log(
    `✔ Seeded 3 reviews (2 approved, 1 pending) for "${product.title}" (${product.id}).`
  )
}
