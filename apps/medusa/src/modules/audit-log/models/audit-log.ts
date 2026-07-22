import { model } from "@medusajs/framework/utils"

/**
 * AuditLog — HIPAA audit trail record (T33).
 *
 * Append-only: rows are written by subscribers and never updated or deleted in
 * normal operation. Captures WHO did WHAT to WHICH entity, plus a JSON blob for
 * additional (non-PHI) context. `created_at` is provided automatically by
 * Medusa's data-model layer.
 *
 * NOTE: do not store PHI/clinical data here — the website's audit scope is
 * identity + orders only (see docs/plan.md PHI boundary).
 *
 * // verify against Medusa v2 module docs — model.define field builders.
 */
const AuditLog = model.define("audit_log", {
  id: model.id().primaryKey(),
  // The subject performing the action (e.g. user id, customer id, "system").
  actor_id: model.text().nullable(),
  // Category of actor: "user" (admin), "customer", "system", etc.
  actor_type: model.text(),
  // The action performed, e.g. "customer.created", "customer.updated".
  action: model.text(),
  // The entity/table affected, e.g. "customer".
  entity: model.text(),
  // The affected record's id.
  entity_id: model.text().nullable(),
  // Additional structured context (non-PHI). JSON column.
  metadata: model.json().nullable(),
})

export default AuditLog
