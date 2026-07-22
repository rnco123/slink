import { Module } from "@medusajs/framework/utils"
import AuditLogModuleService from "./service"

/**
 * Audit Log module (T33) — HIPAA audit hook.
 * Registered in medusa-config.ts via `{ resolve: "./src/modules/audit-log" }`.
 *
 * Run `npx medusa db:generate auditLog` then `npx medusa db:migrate` to create
 * the table once Postgres is up.
 */
export const AUDIT_LOG_MODULE = "auditLog"

export default Module(AUDIT_LOG_MODULE, {
  service: AuditLogModuleService,
})
