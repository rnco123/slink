import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { loadOrders, logger, parseOrderNo } from "../../shared"

/**
 * GET /integrations/mcm/orders/:order_no — fetch one order.
 *
 * Lets MCM-Go recover a single missed webhook delivery without a backfill.
 * Auth + rate limiting are applied in `src/api/middlewares.ts` for the whole
 * `/integrations/mcm/*` surface, so by the time this runs the caller is trusted.
 *
 * Not under `/store/*` on purpose: that surface is reachable by anyone holding
 * the publishable key, which is baked into the browser bundle.
 *
 * `order_no` accepts `SL-3`, a bare `3`, or a literal `custom_display_id`.
 * See `parseOrderNo` for why both forms resolve.
 *
 * 404 only when the identifier matches nothing at all.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const raw = String(req.params.order_no ?? "")
  const { displayId, custom } = parseOrderNo(raw)

  const orderModule: any = req.scope.resolve(Modules.ORDER)

  // Try the custom order number first (an explicitly assigned one wins), then
  // the display_id sequence. `$or` is avoided — two cheap indexed lookups are
  // simpler to reason about than one filter whose operator support varies.
  const filters: Record<string, unknown>[] = [{ custom_display_id: custom }]
  if (displayId !== null) {
    filters.push({ display_id: displayId })
  }

  let found: { id: string } | null = null
  for (const filter of filters) {
    const rows = await orderModule
      .listOrders(filter, { select: ["id"], take: 1 })
      .catch(() => [])
    if (rows.length) {
      found = rows[0]
      break
    }
  }

  if (!found) {
    // order_no is not PHI and not contact data, so it is safe to log and is the
    // only thing that makes a missed-delivery report actionable.
    logger.info("order not found", { order_no: raw })
    return res.status(404).json({
      type: "not_found",
      message: "No order matches that order_no.",
    })
  }

  const [order] = await loadOrders(req.scope, [found.id])
  if (!order) {
    return res.status(404).json({
      type: "not_found",
      message: "No order matches that order_no.",
    })
  }

  // Single-order fetch still returns the array shape: one response contract, so
  // MCM-Go parses both endpoints with the same code path.
  return res.json({ orders: [order], next_cursor: null })
}
