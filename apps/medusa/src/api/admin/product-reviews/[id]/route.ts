import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { PRODUCT_REVIEW_MODULE } from "../../../../modules/product-review"
import ProductReviewModuleService from "../../../../modules/product-review/service"
import { AUDIT_LOG_MODULE } from "../../../../modules/audit-log"
import AuditLogModuleService from "../../../../modules/audit-log/service"

/**
 * POST /admin/product-reviews/:id  — moderate a review (roadmap task 21b).
 * Body: { status: "approved" | "rejected" | "pending" }
 *
 * The approval decision is the compliance gate: only `approved` reviews ever
 * reach the public PDP. Every decision is written to the append-only audit log.
 */
const ALLOWED = new Set(["approved", "rejected", "pending"])

export const POST = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const id = req.params.id
  const body = (req.body ?? {}) as Record<string, unknown>
  const status = typeof body.status === "string" ? body.status : ""

  if (!ALLOWED.has(status)) {
    return res.status(400).json({
      message: "status must be one of: approved, rejected, pending",
    })
  }

  const service: ProductReviewModuleService = req.scope.resolve(
    PRODUCT_REVIEW_MODULE
  )

  const moderatorId = req.auth_context?.actor_id ?? "unknown"
  const moderatedAt = new Date().toISOString()

  const updated = await service.updateProductReviews({
    id,
    status,
    moderated_by: moderatorId,
    moderated_at: moderatedAt,
  })

  const review = Array.isArray(updated) ? updated[0] : updated

  try {
    const audit: AuditLogModuleService = req.scope.resolve(AUDIT_LOG_MODULE)
    await audit.record({
      actor_id: moderatorId,
      actor_type: "user",
      action: `product_review.${status}`,
      entity: "product_review",
      entity_id: id,
      metadata: { product_id: review?.product_id, status },
    })
  } catch {
    // best-effort audit
  }

  res.json({ review })
}

// DELETE /admin/product-reviews/:id — hard-remove (e.g. spam). Rare; audited.
export const DELETE = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const id = req.params.id
  const service: ProductReviewModuleService = req.scope.resolve(
    PRODUCT_REVIEW_MODULE
  )

  await service.deleteProductReviews(id)

  try {
    const audit: AuditLogModuleService = req.scope.resolve(AUDIT_LOG_MODULE)
    await audit.record({
      actor_id: req.auth_context?.actor_id ?? "unknown",
      actor_type: "user",
      action: "product_review.deleted",
      entity: "product_review",
      entity_id: id,
      metadata: null,
    })
  } catch {
    // best-effort audit
  }

  res.status(200).json({ id, deleted: true })
}
