import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"
import AuditLogModuleService from "../modules/audit-log/service"
import { AUDIT_LOG_MODULE } from "../modules/audit-log"
import {
  MCM_KEY_HASH,
  MCM_KEY_LAST4,
  claimKeyLast4,
  generateClaimKey,
  hashClaimKey,
} from "../lib/mcm-claim-key"

/**
 * Order confirmation email + MCM-Go claim key + audit (roadmap tasks 34 + 41).
 *
 * On `order.placed` we send a confirmation email through the Notification module
 * — Resend in production (order emails name health products, so a signed Resend
 * BAA is required before real sends — task 39) and the local/logs provider in
 * dev. Delivery is owned by the provider; we never write the customer email or
 * line items to our own logs (PHI boundary).
 *
 * The email send is wrapped so a delivery hiccup never breaks the order flow
 * (subscribers run after the event, but we still fail soft). We also write an
 * append-only audit entry — IDs + amounts only, no PHI (extends task 33/41
 * coverage from identity events to orders).
 *
 * CLAIM KEY (MCM-Go integration)
 * The buyer needs a per-order secret to claim this order in the telehealth app.
 * We mint it here, store only its SHA-256 hash on the order, and put the
 * PLAINTEXT in the confirmation email — the one and only place it may appear.
 * See ../lib/mcm-claim-key.ts for why the entropy is load-bearing.
 */
export default async function orderPlacedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const orderModule = container.resolve(Modules.ORDER)

  const order = await orderModule.retrieveOrder(data.id, {
    select: ["id", "display_id", "email", "currency_code", "metadata"],
    relations: ["items"],
  })

  // --- MCM-Go claim key ----------------------------------------------------
  // MINT ONCE. Subscribers re-run on retries and replayed events; minting a
  // second key would overwrite the stored hash and SILENTLY invalidate the key
  // already sitting in the buyer's inbox — they would be told it is wrong with
  // nothing to tell them why. Presence of the hash is the idempotency guard.
  //
  // No email means no key: the plaintext may only ever leave via that email, so
  // minting one we cannot deliver would produce an order that looks claimable
  // but never can be. Such orders simply get no key (both fields stay null) and
  // MCM-Go skips them — the same as orders placed before this shipped.
  const existingMetadata = (order.metadata ?? {}) as Record<string, unknown>
  const alreadyIssued = Boolean(existingMetadata[MCM_KEY_HASH])

  let claimKey: string | null = null

  if (order.email && !alreadyIssued) {
    const key = generateClaimKey()
    try {
      // Persist the hash BEFORE the send. If this write fails we never send a
      // key, so the buyer is never holding one we cannot verify. The opposite
      // order risks a delivered key with no stored hash — unclaimable, and
      // indistinguishable from never having been issued.
      await orderModule.updateOrders([
        {
          id: order.id,
          metadata: {
            ...existingMetadata,
            // Hash only. The plaintext is never written to metadata — it would
            // then sit in the DB, in API responses, and in anything that dumps
            // an order, which is exactly what hashing avoids.
            [MCM_KEY_HASH]: hashClaimKey(key),
            [MCM_KEY_LAST4]: claimKeyLast4(key),
          },
        },
      ])
      claimKey = key
    } catch {
      // Could not persist — deliberately send no key rather than one that can
      // never be verified. Nothing about the key is logged, including here.
      claimKey = null
    }
  }

  // --- Confirmation email (fail-soft) --------------------------------------
  if (order.email) {
    try {
      const notificationModule = container.resolve(Modules.NOTIFICATION)
      await notificationModule.createNotifications({
        to: order.email,
        channel: "email",
        template: "order-placed",
        data: {
          display_id: order.display_id,
          currency_code: order.currency_code,
          items: (order.items ?? []).map((i) => ({
            title: i.title,
            quantity: i.quantity,
          })),
          // THE ONLY PLACE THE PLAINTEXT APPEARS. Not logs, not the audit trail,
          // not metadata, not any API response. `null` on a replayed event whose
          // key was already issued — we cannot re-derive it from the hash, and a
          // re-issue would invalidate the one the buyer already has.
          mcm_claim_key: claimKey,
        },
      })
    } catch {
      // Never let an email/provider error break order processing.
    }
  }

  // --- Audit trail (IDs/amounts only, no PHI) ------------------------------
  try {
    const audit: AuditLogModuleService = container.resolve(AUDIT_LOG_MODULE)
    await audit.record({
      actor_id: null,
      actor_type: "system",
      action: "order.placed",
      entity: "order",
      entity_id: order.id,
      metadata: {
        display_id: order.display_id,
        currency_code: order.currency_code,
        // Whether a key was issued is useful for support; the key itself is not
        // recorded — not even its hash, which belongs on the order alone.
        mcm_key_issued: Boolean(claimKey) || alreadyIssued,
      },
    })
  } catch {
    // best-effort audit
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
