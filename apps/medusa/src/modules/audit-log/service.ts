import { MedusaService } from "@medusajs/framework/utils"
import AuditLog from "./models/audit-log"

/**
 * AuditLogModuleService
 *
 * MedusaService auto-generates CRUD methods for each registered model, e.g.
 * `createAuditLogs`, `listAuditLogs`, `retrieveAuditLog`. We deliberately do
 * NOT expose update/delete helpers in our own code — the audit trail is
 * append-only.
 *
 * // verify against Medusa v2 module docs — MedusaService factory + generated
 * // method names (pluralized model key: createAuditLogs / listAuditLogs).
 */
class AuditLogModuleService extends MedusaService({
  AuditLog,
}) {
  /**
   * Convenience wrapper for writing a single append-only audit entry.
   */
  async record(input: {
    actor_id?: string | null
    actor_type: string
    action: string
    entity: string
    entity_id?: string | null
    metadata?: Record<string, unknown> | null
  }) {
    return this.createAuditLogs(input)
  }
}

export default AuditLogModuleService
