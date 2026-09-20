import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import AuditLogModuleService from "../modules/audit-log/service"
import { AUDIT_LOG_MODULE } from "../modules/audit-log"

/**
 * HIPAA audit subscriber (T33).
 *
 * Listens for customer.created / customer.updated and writes an append-only
 * audit entry via the audit-log module. We record identity-level events only
 * (no PHI/clinical data — see docs/plan.md PHI boundary).
 *
 * The event payload for entity events is `{ id }`; the actor is not carried on
 * the event, so actor_type is recorded as "system" here. Enrich with the real
 * actor when auditing is moved to an authenticated API/middleware layer.
 *
 * // verify against Medusa v2 module docs — event names (customer.created /
 * // customer.updated) and SubscriberArgs data shape ({ id }).
 */
export default async function auditCustomerHandler({
  event: { data, name },
  container,
}: SubscriberArgs<{ id: string }>) {
  const auditLogModuleService: AuditLogModuleService =
    container.resolve(AUDIT_LOG_MODULE)

  await auditLogModuleService.record({
    actor_id: null,
    actor_type: "system",
    action: name, // "customer.created" | "customer.updated"
    entity: "customer",
    entity_id: data.id,
    metadata: { event: name },
  })
}

export const config: SubscriberConfig = {
  event: ["customer.created", "customer.updated"],
}
