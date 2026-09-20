import { Module } from "@medusajs/framework/utils"
import ProductReviewModuleService from "./service"

/**
 * Product Review module (roadmap task 21b) — custom reviews with a mandatory
 * moderation gate (unmoderated health claims = LegitScript/FTC risk).
 * Registered in medusa-config.ts via `{ resolve: "./src/modules/product-review" }`.
 *
 * Run `npx medusa db:generate productReview` then `npx medusa db:migrate` to
 * create the table.
 */
export const PRODUCT_REVIEW_MODULE = "productReview"

export default Module(PRODUCT_REVIEW_MODULE, {
  service: ProductReviewModuleService,
})
