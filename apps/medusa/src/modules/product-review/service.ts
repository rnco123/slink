import { MedusaService } from "@medusajs/framework/utils"
import ProductReview from "./models/product-review"

/**
 * ProductReviewModuleService
 *
 * MedusaService auto-generates CRUD (`createProductReviews`,
 * `listProductReviews`, `retrieveProductReview`, `updateProductReviews`, …).
 * We add read helpers for the two aggregate shapes the app needs: a per-product
 * rating summary (for the PDP star line + JSON-LD AggregateRating) and a
 * batched summary for product listings.
 *
 * // verify against Medusa v2 module docs — MedusaService generated method names
 * // (pluralized model key: createProductReviews / listProductReviews).
 */
class ProductReviewModuleService extends MedusaService({
  ProductReview,
}) {
  /**
   * Approved-review summary for one product: count + average (1 decimal).
   * Only `approved` reviews count toward the public rating.
   */
  async getApprovedSummary(
    productId: string
  ): Promise<{ count: number; average: number }> {
    const reviews = await this.listProductReviews(
      { product_id: productId, status: "approved" },
      { select: ["rating"] }
    )
    return summarize(reviews as { rating: number }[])
  }

  /**
   * Batched summaries for many products at once (product grids). Returns a map
   * keyed by product_id. Products with no approved reviews are absent.
   */
  async getApprovedSummaries(
    productIds: string[]
  ): Promise<Record<string, { count: number; average: number }>> {
    if (!productIds.length) return {}
    const reviews = (await this.listProductReviews(
      { product_id: productIds, status: "approved" },
      { select: ["product_id", "rating"] }
    )) as { product_id: string; rating: number }[]

    const byProduct: Record<string, { rating: number }[]> = {}
    for (const r of reviews) {
      ;(byProduct[r.product_id] ??= []).push({ rating: r.rating })
    }
    const out: Record<string, { count: number; average: number }> = {}
    for (const [pid, list] of Object.entries(byProduct)) {
      out[pid] = summarize(list)
    }
    return out
  }
}

function summarize(reviews: { rating: number }[]): {
  count: number
  average: number
} {
  const count = reviews.length
  if (!count) return { count: 0, average: 0 }
  const sum = reviews.reduce((s, r) => s + (r.rating || 0), 0)
  return { count, average: Math.round((sum / count) * 10) / 10 }
}

export default ProductReviewModuleService
