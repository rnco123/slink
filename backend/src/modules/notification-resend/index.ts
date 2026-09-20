import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import ResendNotificationProviderService from "./service"

/**
 * Resend notification provider module — the production email path (replaces
 * AWS SES). Registered in `medusa-config.ts` under the Notification module as
 * `{ resolve: "./src/modules/notification-resend", id: "resend" }` whenever
 * RESEND_API_KEY + RESEND_FROM are present; otherwise Medusa falls back to
 * `@medusajs/notification-local`, which logs instead of sending.
 */
export default ModuleProvider(Modules.NOTIFICATION, {
  services: [ResendNotificationProviderService],
})
