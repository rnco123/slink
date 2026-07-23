import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"
import AuditLogModuleService from "../modules/audit-log/service"
import { AUDIT_LOG_MODULE } from "../modules/audit-log"

/**
 * Order confirmation email + audit (roadmap tasks 34 + 41).
 *
 * On `order.placed` we send a confirmation email through the Notification module
 * — SES in production (BAA-eligible; order emails name health products, so a
 * signed AWS BAA is required before real sends — task 39) and the local/logs
 * provider in dev. Delivery is owned by the provider; we never write the
 * customer email or line items to our own logs (PHI boundary).
 *
 * The email send is wrapped so a delivery hiccup never breaks the order flow
 * (subscribers run after the event, but we still fail soft). We also write an
 * append-only audit entry — IDs + amounts only, no PHI (extends task 33/41
 * coverage from identity events to orders).
 */
export default async function orderPlacedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const orderModule = container.resolve(Modules.ORDER)

  const order = await orderModule.retrieveOrder(data.id, {
    select: ["id", "display_id", "email", "currency_code"],
    relations: ["items"],
  })

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
      },
    })
  } catch {
    // best-effort audit
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
