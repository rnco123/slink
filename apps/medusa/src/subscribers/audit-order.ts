import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import AuditLogModuleService from "../modules/audit-log/service"
import { AUDIT_LOG_MODULE } from "../modules/audit-log"

/**
 * Order-lifecycle audit (roadmap task 41 — widen HIPAA audit coverage).
 *
 * Complements audit-customer.ts (identity events) and order-placed.ts
 * (order.placed) by recording the significant post-placement order state
 * changes. Append-only, IDs only — no PHI/clinical data (see docs/plan.md PHI
 * boundary). `order.placed` is intentionally NOT listed here (the order-placed
 * subscriber already audits it) to avoid a duplicate entry.
 */
export default async function auditOrderHandler({
  event: { data, name },
  container,
}: SubscriberArgs<{ id: string }>) {
  const audit: AuditLogModuleService = container.resolve(AUDIT_LOG_MODULE)
  await audit.record({
    actor_id: null,
    actor_type: "system",
    action: name, // "order.canceled" | "order.completed"
    entity: "order",
    entity_id: data.id,
    metadata: { event: name },
  })
}

export const config: SubscriberConfig = {
  event: ["order.canceled", "order.completed"],
}
