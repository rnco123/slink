import crypto from "node:crypto"
import type {
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { z } from "zod"
import { createSafeLogger } from "../../../lib/safe-logger"
import { MCM_KEY_HASH, MCM_KEY_LAST4 } from "../../../lib/mcm-claim-key"

/**
 * Shared plumbing for the MCM-Go read API (`/integrations/mcm/*`).
 *
 * MCM-Go is our telehealth app. SaludLink pushes paid orders to it; these READ
 * endpoints let it recover a missed delivery, backfill history, and answer
 * "what did this buyer actually purchase?" during support.
 *
 * READ ONLY, BY DECISION. MCM-Go never writes back. There is deliberately no
 * create/update/cancel here, and the auth below is shaped for a caller that only
 * ever reads — a single shared service token, no per-actor identity, no scopes.
 * If MCM-Go ever needs to mutate, that is a different auth design, not a new
 * route bolted onto this one.
 *
 * PHI BOUNDARY (docs/privacy-boundary.md). Everything returned is on the allowed
 * commerce/identity lists: customer id, email, name, phone, order + line-item
 * ids, status, timestamps, money, currency, and per item the product/variant id,
 * SKU, title, quantity and price. Never diagnosis, medication, dose,
 * prescription, clinical notes, encounter/provider ids or ICD/CPT/NDC codes.
 *
 * Note rule 7's distinction: a product TITLE on a line item is commerce data and
 * is fine ("Tirzepatide 10 mg — 4 week supply"). A field NAMED `medication` or
 * `dose` is not — same string, clinical framing. We return `title` and `sku`.
 */

export const logger = createSafeLogger({ base: { scope: "integrations.mcm" } })

// ---------------------------------------------------------------------------
// Authentication — service-to-service bearer token.
// ---------------------------------------------------------------------------

/**
 * Compare two secrets in constant time.
 *
 * `crypto.timingSafeEqual` THROWS when the buffers differ in length, and the
 * throw itself leaks length. So both sides are SHA-256'd first: digests are
 * always 32 bytes, so the comparison is well-defined and constant-time over the
 * whole input regardless of what the caller sent.
 */
function secretsMatch(provided: string, expected: string): boolean {
  const a = crypto.createHash("sha256").update(provided, "utf8").digest()
  const b = crypto.createHash("sha256").update(expected, "utf8").digest()
  return crypto.timingSafeEqual(a, b)
}

/** Every rejection is byte-identical: missing, malformed and wrong all look the same. */
function reject(res: MedusaResponse): void {
  res.status(401).json({ type: "unauthorized", message: "Unauthorized" })
}

/**
 * Bearer-token guard for the MCM integration surface.
 *
 * FAILS CLOSED: if `MCM_INTEGRATION_TOKEN` is unset or blank, every request is
 * rejected. There is no development fallback and no "open when unconfigured"
 * path — an unconfigured deploy serves nothing rather than serving everything.
 */
export function authenticateMcm() {
  return function mcmAuthMiddleware(
    req: MedusaRequest,
    res: MedusaResponse,
    next: MedusaNextFunction
  ): void {
    const expected = process.env.MCM_INTEGRATION_TOKEN

    if (!expected || !expected.trim()) {
      // Deliberately not a 500: an unconfigured integration is indistinguishable
      // from a wrong token to the caller, so nothing is leaked about our state.
      logger.error("MCM_INTEGRATION_TOKEN is not set — rejecting request")
      return reject(res)
    }

    const header = req.headers["authorization"]
    const raw = Array.isArray(header) ? header[0] : header
    if (typeof raw !== "string") return reject(res)

    // Case-insensitive scheme, exactly one space, non-empty token.
    const match = /^Bearer[ ]([A-Za-z0-9._~+/=-]+)$/i.exec(raw.trim())
    if (!match) return reject(res)

    if (!secretsMatch(match[1], expected.trim())) return reject(res)

    next()
  }
}

// ---------------------------------------------------------------------------
// Order number
// ---------------------------------------------------------------------------

/**
 * `order_no` — the per-order key MCM-Go dedupes on. It must be stable across
 * redeliveries and unique per order.
 *
 * THE SPEC SAID: map this to whichever of `custom_display_id` or `display_id`
 * "the webhook already sends — check the sender before assuming."
 *
 * WHAT I FOUND: there is no sender. This repo has no outbound MCM webhook and
 * never has (the only outbound HTTP call in the backend is Resend). So there is
 * no established mapping to match, and this is a decision rather than a lookup.
 *
 * CHOSEN: `custom_display_id` when set, else `SL-<display_id>`.
 *  - `custom_display_id` is Medusa's field for exactly this and is currently
 *    null on every order, so today every order_no is `SL-<n>`.
 *  - The `SL-` prefix matches the format MCM-Go's own SALUDLINK-API.md documents
 *    (`SL-4821`), so the future sender and this API agree by construction.
 *  - `display_id` is a monotonic per-order sequence, so the value is stable
 *    across redeliveries and unique — the two properties MCM-Go needs.
 */
export function orderNo(order: {
  custom_display_id?: string | null
  display_id?: number | null
}): string {
  const custom = order.custom_display_id?.trim()
  if (custom) return custom
  return `SL-${order.display_id}`
}

/**
 * Resolve an inbound `order_no` to the filters that could match it.
 *
 * Accepts `SL-3`, a bare `3`, or a literal `custom_display_id`, so a caller
 * holding an older or hand-typed form still resolves. Returns the candidate
 * `display_id` (if the value looks numeric after stripping the prefix) and the
 * raw string to try against `custom_display_id`.
 */
export function parseOrderNo(value: string): {
  displayId: number | null
  custom: string
} {
  const raw = value.trim()
  const stripped = raw.replace(/^SL-/i, "")
  const n = Number.parseInt(stripped, 10)
  const displayId =
    Number.isInteger(n) && String(n) === stripped && n > 0 ? n : null
  return { displayId, custom: raw }
}

// ---------------------------------------------------------------------------
// Serialization
// ---------------------------------------------------------------------------

/**
 * Follow-up credits granted with the order.
 *
 * PERSISTENCE CHOICE: read from `order.metadata.credits` — the `metadata` jsonb
 * column, not a new table and not a new column on a Medusa core table. Reason:
 * it is a single scalar hanging off an order with no independent lifecycle,
 * nothing queries or aggregates it, and Medusa owns the `order` table across 30+
 * migrations so adding a column there invites an upgrade collision.
 *
 * Defaults to 2, matching the default MCM-Go's receiver already applies
 * (`credits_granted: p.credits ?? 2`), so the two systems agree when the field
 * is absent. Stays at ORDER level even if products differ — if credits ever vary
 * per product, sum them into this one field rather than adding a per-item field.
 */
const DEFAULT_CREDITS = 2

function creditsFor(
  metadata: Record<string, unknown> | null | undefined
): number {
  const raw = metadata?.credits
  if (typeof raw === "number" && Number.isFinite(raw) && raw >= 0) {
    return raw
  }
  return DEFAULT_CREDITS
}

/** Read a string off order metadata, or null when absent/blank/wrong type. */
function metaString(
  metadata: Record<string, unknown> | null | undefined,
  key: string
): string | null {
  const raw = metadata?.[key]
  return typeof raw === "string" && raw.trim() ? raw : null
}

/**
 * Coerce a Medusa money value to a plain JSON number.
 *
 * Medusa 2.x returns totals as `BigNumber` instances, NOT numbers — they carry
 * the value in `numeric`/`raw_` and only look numeric because `toString()` does
 * the work. Reading them naively yields 0 and silently reports every order as
 * free (caught in live testing), so unwrap explicitly and fall back to
 * `String(...)` for any shape not enumerated here.
 */
function money(value: unknown): number {
  if (value === null || value === undefined) return 0
  if (typeof value === "number") return Number.isFinite(value) ? value : 0
  if (typeof value === "string") {
    const n = Number.parseFloat(value)
    return Number.isFinite(n) ? n : 0
  }
  if (typeof value === "object") {
    const v = value as Record<string, unknown>
    for (const key of ["numeric", "value", "numeric_"]) {
      if (key in v && v[key] !== undefined && v[key] !== null) {
        return money(v[key])
      }
    }
    const n = Number.parseFloat(String(value))
    return Number.isFinite(n) ? n : 0
  }
  return 0
}

function iso(value: unknown): string | null {
  if (!value) return null
  const d = value instanceof Date ? value : new Date(String(value))
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

export type McmLineItem = {
  line_item_id: string
  product_id: string | null
  variant_id: string | null
  sku: string | null
  title: string | null
  quantity: number
  unit_price: number
  subtotal: number
}

export type McmOrder = {
  order_no: string
  order_id: string
  saludlink_code: string | null
  email: string | null
  first_name: string | null
  last_name: string | null
  phone: string | null
  status: string
  created_at: string | null
  currency_code: string | null
  total: number
  shipping_total: number
  tax_total: number
  credits: number
  /**
   * SHA-256 of the buyer's claim key, lowercase hex — what MCM-Go compares the
   * typed key against. `null` for orders placed before claim keys shipped, and
   * for orders with no email (there was nowhere to send a key). Those orders are
   * unclaimable and MCM-Go skips them; that is correct, not a gap to paper over
   * with a synthesised key.
   *
   * Safe to return: a hash of an 80-bit random key is opaque and irreversible,
   * a credential artifact rather than health data, and absent from every list in
   * docs/privacy-boundary.md. The hash alone claims nothing — only the plaintext
   * the buyer holds can.
   */
  secret_key_hash: string | null
  /** Last 4 characters of that key, so support can confirm which key a caller
   *  is reading out. Not recoverable from the hash. */
  secret_key_last4: string | null
  items: McmLineItem[]
}

/**
 * Shape one order for MCM-Go.
 *
 * `items` is ALWAYS an array and is never collapsed to a first-item summary or
 * flattened into order-level product/sku fields: a single order can carry a
 * medication plus supplies, or two doses, and MCM-Go reconciles line by line.
 * Two lines of the same product with different variants stay distinct because
 * each line item is emitted on its own `line_item_id`.
 *
 * We do NOT classify items. An order may mix products that matter clinically
 * with ones that do not; they all go back as commerce line items and MCM-Go
 * decides what they mean.
 *
 * Buyer identity sits on the order, not in a separate customer block — MCM-Go
 * builds its patient record from whatever arrives with an order.
 *
 * `shipping_total` / `tax_total` are ADDITIONS to the specified response shape.
 * They are plain commerce data, and without them per-item `subtotal` values
 * cannot be reconciled against `total`: items sum to the goods subtotal, and
 * total = items + shipping + tax. Extra keys are additive and safe for MCM-Go's
 * parser, which picks named fields. Fulfillment/tracking is deliberately absent
 * for now and slots in as another field on this object when it lands.
 */
export function serializeOrder(order: any): McmOrder {
  const address = order?.shipping_address ?? order?.billing_address ?? null
  const customer = order?.customer ?? null

  const items: McmLineItem[] = (order?.items ?? []).map((item: any) => {
    const quantity = Number(item?.quantity ?? 0)
    const unitPrice = money(item?.unit_price)
    // Prefer Medusa's computed subtotal; fall back to unit × qty so a line is
    // never silently reported as 0 when totals were not selected.
    const subtotal =
      item?.subtotal === undefined || item?.subtotal === null
        ? unitPrice * quantity
        : money(item.subtotal)
    return {
      line_item_id: String(item?.id),
      product_id: item?.product_id ?? null,
      variant_id: item?.variant_id ?? null,
      sku: item?.variant_sku ?? null,
      title: item?.title ?? null,
      quantity,
      unit_price: unitPrice,
      subtotal,
    }
  })

  return {
    order_no: orderNo(order),
    order_id: String(order?.id),
    // The SaludLink code IS the customer id — one word for one thing across
    // both systems. Identity data, explicitly allowed by the privacy boundary.
    saludlink_code: order?.customer_id ?? customer?.id ?? null,
    email: order?.email ?? customer?.email ?? null,
    first_name: customer?.first_name ?? address?.first_name ?? null,
    last_name: customer?.last_name ?? address?.last_name ?? null,
    phone: customer?.phone ?? address?.phone ?? null,
    // Real status, always — including canceled and refunded orders. Omitting
    // them would make a missing order indistinguishable from one that never
    // arrived, and MCM-Go decides what a status means.
    status: String(order?.status ?? "unknown"),
    created_at: iso(order?.created_at),
    currency_code: order?.currency_code ?? null,
    total: money(order?.total),
    shipping_total: money(order?.shipping_total),
    tax_total: money(order?.tax_total),
    credits: creditsFor(order?.metadata),
    // Mapped EXPLICITLY, exactly as `credits` is: this serializer deliberately
    // drops unrecognised metadata (so a stray `diagnosis` can never leak), which
    // means a new field is invisible until it is named here.
    secret_key_hash: metaString(order?.metadata, MCM_KEY_HASH),
    secret_key_last4: metaString(order?.metadata, MCM_KEY_LAST4),
    items,
  }
}

/**
 * Load full orders (totals + items + buyer) for a set of ids, preserving the
 * order of `ids`.
 *
 * WHY PER-ID: `listOrders`/`query.graph` throw "Shipping method version is
 * required to load adjustments" when computed totals are requested across a
 * list (verified against 2.16.0). Retrieving each order with an explicit totals
 * `select` is the shape that actually works. Bounded by the page size (max 100).
 */
export async function loadOrders(
  scope: MedusaRequest["scope"],
  ids: string[]
): Promise<McmOrder[]> {
  if (!ids.length) return []
  const orderModule: any = scope.resolve(Modules.ORDER)

  const loaded = await Promise.all(
    ids.map((id) =>
      orderModule
        .retrieveOrder(id, {
          select: [
            "id",
            "display_id",
            "custom_display_id",
            "customer_id",
            "email",
            "status",
            "currency_code",
            "created_at",
            "metadata",
            "total",
            "shipping_total",
            "tax_total",
          ],
          relations: ["items", "shipping_methods", "shipping_address"],
        })
        .catch(() => null)
    )
  )

  return loaded.filter(Boolean).map(serializeOrder)
}

// ---------------------------------------------------------------------------
// Request validation + paging (kept here, not in the route files, so they are
// unit-testable without booting the HTTP stack).
// ---------------------------------------------------------------------------

/**
 * Strict schema for the lookup body: unknown keys are rejected with 400
 * (privacy rule 1). Not pedantry — it stops a caller smuggling an unexpected
 * field (say `diagnosis`) into a request we might later log or echo.
 */
export const LookupSchema = z
  .strictObject({
    saludlink_code: z.string().trim().min(1).max(120).optional(),
    email: z.string().trim().email().max(200).optional(),
    limit: z.number().int().min(1).max(100).optional(),
    cursor: z.string().trim().max(200).optional(),
  })
  .refine((v) => Boolean(v.saludlink_code || v.email), {
    message: "Provide saludlink_code or email.",
  })

export const DEFAULT_LIMIT = 50

/**
 * Opaque cursor over an offset.
 *
 * Kept opaque so the paging strategy can change without breaking MCM-Go.
 * Trade-off, stated plainly: results are newest-first, so an order created
 * mid-pagination shifts later pages and MCM-Go can see a row twice. That is
 * safe — it dedupes on `order_no`. The failure that would matter, a MISSED row,
 * does not happen this way: new rows enter at the front rather than displacing
 * unread ones.
 */
export const encodeCursor = (offset: number): string =>
  Buffer.from(String(offset), "utf8").toString("base64url")

export function decodeCursor(cursor?: string): number {
  if (!cursor) return 0
  try {
    const n = Number.parseInt(
      Buffer.from(cursor, "base64url").toString("utf8"),
      10
    )
    return Number.isInteger(n) && n >= 0 ? n : 0
  } catch {
    return 0
  }
}
