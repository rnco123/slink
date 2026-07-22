import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PRODUCT_REVIEW_MODULE } from "../../../modules/product-review"
import ProductReviewModuleService from "../../../modules/product-review/service"

/**
 * GET /admin/product-reviews?status=pending&limit=&offset=
 *
 * Moderation queue (roadmap task 21b). Admin-only (under /admin, guarded by the
 * built-in admin auth). Defaults to the `pending` queue since that's the review
 * work; pass `status=all` to see everything.
 */
const MAX_LIMIT = 100

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const service: ProductReviewModuleService = req.scope.resolve(
    PRODUCT_REVIEW_MODULE
  )

  const url = new URL(req.url, "http://localhost")
  const status = url.searchParams.get("status") || "pending"
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, parseInt(url.searchParams.get("limit") || "50", 10) || 50)
  )
  const offset = Math.max(
    0,
    parseInt(url.searchParams.get("offset") || "0", 10) || 0
  )

  const filters: Record<string, unknown> = {}
  if (status !== "all") {
    filters.status = status
  }

  const [reviews, count] = await service.listAndCountProductReviews(filters, {
    order: { created_at: "DESC" },
    skip: offset,
    take: limit,
  })

  res.json({ reviews, count, limit, offset })
}
