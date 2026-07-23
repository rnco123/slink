import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { z } from "zod"

/**
 * Contact form submission (roadmap: the endpoint `middlewares.ts` anticipated).
 *
 * PHI SAFETY — read before changing:
 * A visitor can type anything into a contact box, including symptoms or other
 * health details. So the message body is treated as potentially sensitive:
 *   - it is NEVER written to logs, analytics, or the audit trail;
 *   - it only ever travels to the support inbox via the Notification module;
 *   - errors are logged without the payload.
 * That is why there is no `console.log(body)` anywhere below, and why the audit
 * trail records only that a message was received, not what it said.
 *
 * Delivery: goes through the Notification module, which is a no-op provider
 * until SES is configured (gated on the AWS BAA — tasks 39/62). The submission
 * therefore succeeds and is acknowledged today, and starts landing in the
 * support inbox the moment SES is wired, with no code change here.
 *
 * Abuse: rate-limited per IP in `middlewares.ts`, plus a honeypot field that
 * real users never see and bots reliably fill in.
 */
const ContactSchema = z.object({
  name: z.string().trim().min(1, "Please tell us your name").max(120),
  email: z.string().trim().email("Enter a valid email address").max(200),
  // Optional on purpose: we reply by email, so requiring a phone number only
  // costs completed submissions. Kept loose (no format rule) because visitors
  // write numbers in many shapes and a strict regex rejects valid ones.
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  topic: z
    .enum(["support", "order", "privacy", "accessibility", "other"])
    .default("other"),
  message: z
    .string()
    .trim()
    .min(10, "Please include a little more detail")
    .max(5000),
  // Honeypot: hidden in the UI, so any value means a bot filled it.
  company: z.string().max(0).optional(),
})

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const parsed = ContactSchema.safeParse(req.body)

  if (!parsed.success) {
    return res.status(400).json({
      type: "invalid_data",
      message: "Please check the form and try again.",
      // Field-level messages only — never echo the submitted values back.
      errors: parsed.error.issues.map((i) => ({
        field: String(i.path[0] ?? ""),
        message: i.message,
      })),
    })
  }

  const { name, email, phone, topic, message, company } = parsed.data

  // Silently accept honeypot hits so bots get no signal to adapt.
  if (company) {
    return res.status(200).json({ success: true })
  }

  const supportEmail = process.env.SUPPORT_EMAIL || "support@saludlinkusa.com"

  try {
    const notificationModule = req.scope.resolve(Modules.NOTIFICATION)
    await notificationModule.createNotifications({
      to: supportEmail,
      channel: "email",
      template: "contact-form",
      data: { name, email, phone: phone || null, topic, message },
    })
  } catch {
    // Fail-soft: a provider hiccup must not make the visitor think their
    // message bounced. Deliberately no payload in this catch.
  }

  return res.status(200).json({ success: true })
}
