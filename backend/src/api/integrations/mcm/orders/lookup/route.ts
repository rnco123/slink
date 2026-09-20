import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import {
  DEFAULT_LIMIT,
  LookupSchema,
  decodeCursor,
  encodeCursor,
  loadOrders,
  logger,
} from "../../shared"

/**
 * POST /integrations/mcm/orders/lookup — list one customer's orders.
 *
 * A CUSTOMER HAS MANY ORDERS. The SaludLink code identifies a PERSON, not a
 * purchase: a buyer can order once and again three months later, and both
 * belong to the same MCM-Go patient. So this always returns an ARRAY, even for
 * one order, and `saludlink_code` repeats across that customer's orders — that
 * is correct, not duplication.
 *
 * IDENTIFIERS GO IN THE BODY, NOT THE QUERY STRING. Privacy rule 4 has
 * `createSafeLogger` redacting emails, but a query parameter lands in access
 * logs, proxy logs and `Referer` headers BEFORE any redaction of ours runs.
 * A POST body does not. That is why a read is a POST here.
 *
 * Auth + rate limiting live in `src/api/middlewares.ts` for `/integrations/mcm/*`.
 */

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const parsed = LookupSchema.safeParse(req.body)

  if (!parsed.success) {
    // Field names only — never echo submitted values back into a response.
    return res.status(400).json({
      type: "invalid_data",
      message: "Invalid request body.",
      errors: parsed.error.issues.map((i) => ({
        field: i.path.map(String).join(".") || "(body)",
        message: i.message,
      })),
    })
  }

  const { saludlink_code, email, limit = DEFAULT_LIMIT, cursor } = parsed.data
  const offset = decodeCursor(cursor)

  const customerModule: any = req.scope.resolve(Modules.CUSTOMER)
  const orderModule: any = req.scope.resolve(Modules.ORDER)

  // Prefer the code: it survives a customer changing their email.
  let customerId: string | null = null

  if (saludlink_code) {
    const rows = await customerModule
      .listCustomers({ id: saludlink_code }, { select: ["id"], take: 1 })
      .catch(() => [])
    if (!rows.length) {
      // The identifier matches nothing at all → 404. Distinct from a known
      // customer who has never bought, which is 200 + [].
      logger.info("lookup: unknown saludlink_code")
      return res.status(404).json({
        type: "not_found",
        message: "No customer matches that identifier.",
      })
    }
    customerId = rows[0].id
  } else if (email) {
    const rows = await customerModule
      .listCustomers({ email }, { select: ["id"], take: 1 })
      .catch(() => [])
    if (rows.length) {
      customerId = rows[0].id
    } else {
      // No customer record, but guest orders can still carry the email. Only
      // 404 when neither matches anything.
      const guest = await orderModule
        .listOrders({ email }, { select: ["id"], take: 1 })
        .catch(() => [])
      if (!guest.length) {
        logger.info("lookup: unknown email")
        return res.status(404).json({
          type: "not_found",
          message: "No customer matches that identifier.",
        })
      }
    }
  }

  const filter = customerId ? { customer_id: customerId } : { email }

  // Fetch one extra row to learn whether another page exists, without a count.
  const page = await orderModule
    .listOrders(filter, {
      select: ["id"],
      order: { created_at: "DESC" },
      skip: offset,
      take: limit + 1,
    })
    .catch(() => [])

  const hasMore = page.length > limit
  const ids = page.slice(0, limit).map((o: { id: string }) => o.id)

  const orders = await loadOrders(req.scope, ids)

  logger.info("lookup served", {
    matched_by: saludlink_code ? "saludlink_code" : "email",
    returned: orders.length,
    has_more: hasMore,
  })

  // A known customer who never bought gets 200 and an empty array.
  return res.json({
    orders,
    next_cursor: hasMore ? encodeCursor(offset + ids.length) : null,
  })
}
