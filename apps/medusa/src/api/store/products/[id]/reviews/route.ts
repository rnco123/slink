import {
  AuthenticatedMedusaRequest,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { PRODUCT_REVIEW_MODULE } from "../../../../../modules/product-review"
import ProductReviewModuleService from "../../../../../modules/product-review/service"
import { AUDIT_LOG_MODULE } from "../../../../../modules/audit-log"
import AuditLogModuleService from "../../../../../modules/audit-log/service"

/**
 * Store product-reviews API (roadmap task 21b).
 *
 * GET  /store/products/:id/reviews  — PUBLIC. Approved reviews only, paginated,
 *                                     plus the aggregate {count, average}.
 * POST /store/products/:id/reviews  — AUTHENTICATED customer (see middlewares.ts).
 *                                     Lands as `pending`; never visible until an
 *                                     admin approves it (compliance gate).
 *
 * PHI/privacy boundary: review free-text (title/content) is NEVER written to
 * logs or analytics here — only ids, rating, and the verified-purchase flag are
 * ever logged. See docs/privacy-boundary.md.
 */

const MAX_LIMIT = 50

// GET — public list of approved reviews for the product.
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const productId = req.params.id
  const service: ProductReviewModuleService = req.scope.resolve(
    PRODUCT_REVIEW_MODULE
  )

  const url = new URL(req.url, "http://localhost")
  const limit = clamp(
    parseInt(url.searchParams.get("limit") || "10", 10) || 10,
    1,
    MAX_LIMIT
  )
  const offset = Math.max(
    0,
    parseInt(url.searchParams.get("offset") || "0", 10) || 0
  )

  const [reviews, count] = await service.listAndCountProductReviews(
    { product_id: productId, status: "approved" },
    {
      select: [
        "id",
        "display_name",
        "rating",
        "title",
        "content",
        "verified_purchase",
        "created_at",
      ],
      order: { created_at: "DESC" },
      skip: offset,
      take: limit,
    }
  )

  const summary = await service.getApprovedSummary(productId)

  res.json({ reviews, count, limit, offset, summary })
}

// POST — authenticated customer submits a review (moderated).
export const POST = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const productId = req.params.id
  const customerId = req.auth_context?.actor_id

  if (!customerId) {
    return res
      .status(401)
      .json({ message: "You must be signed in to write a review." })
  }

  const body = (req.body ?? {}) as Record<string, unknown>
  const rating = Number(body.rating)
  const content = typeof body.content === "string" ? body.content.trim() : ""
  const title =
    typeof body.title === "string" && body.title.trim()
      ? body.title.trim()
      : null
  const displayName =
    typeof body.display_name === "string" && body.display_name.trim()
      ? body.display_name.trim().slice(0, 60)
      : "Verified Customer"

  // --- Validation (named, user-facing) ---
  const errors: string[] = []
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    errors.push("rating must be a whole number from 1 to 5")
  }
  if (content.length < 10) {
    errors.push("content must be at least 10 characters")
  }
  if (content.length > 4000) {
    errors.push("content must be at most 4000 characters")
  }
  if (title && title.length > 120) {
    errors.push("title must be at most 120 characters")
  }
  if (errors.length) {
    return res.status(400).json({ message: errors.join("; ") })
  }

  const service: ProductReviewModuleService = req.scope.resolve(
    PRODUCT_REVIEW_MODULE
  )

  // One review per customer per product — update the existing (back to pending)
  // rather than piling up duplicates.
  const existing = await service.listProductReviews(
    { product_id: productId, customer_id: customerId },
    { select: ["id"], take: 1 }
  )

  // --- Verified-purchase check: does this customer own an order with the product? ---
  const verifiedPurchase = await hasPurchased(req, customerId, productId)

  const fields = {
    product_id: productId,
    customer_id: customerId,
    display_name: displayName,
    rating,
    title,
    content,
    verified_purchase: verifiedPurchase,
    // Re-submitting resets moderation.
    status: "pending" as const,
    moderated_by: null,
    moderated_at: null,
  }

  let review
  if (existing.length) {
    review = await service.updateProductReviews({
      id: existing[0]!.id,
      ...fields,
    })
  } else {
    review = await service.createProductReviews(fields)
  }

  // Compliance audit trail — IDs + rating only, NEVER the free-text.
  try {
    const audit: AuditLogModuleService = req.scope.resolve(AUDIT_LOG_MODULE)
    await audit.record({
      actor_id: customerId,
      actor_type: "customer",
      action: existing.length
        ? "product_review.resubmitted"
        : "product_review.submitted",
      entity: "product_review",
      entity_id: Array.isArray(review) ? review[0]?.id : review?.id,
      metadata: {
        product_id: productId,
        rating,
        verified_purchase: verifiedPurchase,
      },
    })
  } catch {
    // Audit is best-effort; never block a submission on it.
  }

  const created = Array.isArray(review) ? review[0] : review
  res.status(201).json({
    review: {
      id: created?.id,
      status: created?.status,
      verified_purchase: created?.verified_purchase,
    },
    message: "Thank you — your review will appear once it has been approved.",
  })
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

/**
 * True when the customer has at least one order containing this product.
 * Best-effort: a failure here just yields `false` (unverified), never a 500.
 */
async function hasPurchased(
  req: MedusaRequest,
  customerId: string,
  productId: string
): Promise<boolean> {
  try {
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
    const { data: orders } = await query.graph({
      entity: "order",
      filters: { customer_id: customerId },
      fields: ["items.product_id"],
    })
    return (orders as { items?: { product_id?: string }[] }[]).some((o) =>
      (o.items ?? []).some((i) => i.product_id === productId)
    )
  } catch {
    return false
  }
}
