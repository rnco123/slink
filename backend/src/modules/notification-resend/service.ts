import { AbstractNotificationProviderService } from "@medusajs/framework/utils"
import type {
  ProviderSendNotificationDTO,
  ProviderSendNotificationResultsDTO,
} from "@medusajs/framework/types"

/** Options supplied from `medusa-config.ts` for this provider. */
export type ResendOptions = {
  /** Resend API key (`re_...`). */
  apiKey: string
  /** Verified sender, e.g. `Saludlink <no-reply@saludlinkusa.com>`. */
  from: string
}

/** Escape untrusted values before interpolating them into an HTML email body. */
function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

type OrderPlacedData = {
  display_id?: number | string
  currency_code?: string
  items?: { title?: string; quantity?: number }[]
  /**
   * MCM-Go claim key, PLAINTEXT. This email is the only place it may appear —
   * we store only its SHA-256 hash, so if it is not rendered here the buyer can
   * never claim their order and we cannot recover the value for them.
   * Null on a replayed order.placed whose key was already issued.
   */
  mcm_claim_key?: string | null
}

type ContactFormData = {
  name?: string
  email?: string
  phone?: string | null
  topic?: string
  message?: string
}

/**
 * The claim-key block of the order email.
 *
 * This is the ONLY place the plaintext key is ever shown. We keep a SHA-256 hash
 * and nothing else, so an email that omits this block leaves the buyer unable to
 * claim their order with no way for support to recover the key — the failure is
 * silent, which is why it is rendered here rather than assumed.
 *
 * Omitted entirely when there is no key (an order placed before claim keys
 * shipped, or a replayed event whose key was already issued) rather than
 * printing an empty box.
 */
function claimKeyBlock(key?: string | null): string {
  if (!key) return ""
  return `<p><strong>Your telehealth claim key</strong></p>
<p style="font-family:monospace;font-size:18px;letter-spacing:1px">${esc(
    key
  )}</p>
<p>Enter this when you sign up for your follow-up visit to claim this order and
its visit credits. Keep it safe — we cannot show it to you again.</p>`
}

/**
 * Render one of the templates the app actually sends. Kept as small inline
 * builders rather than a template engine — there are two of them, and an email
 * that names health products must not pass through a third-party renderer.
 */
export function render(
  template: string,
  data: Record<string, unknown>
): { subject: string; html: string } | null {
  switch (template) {
    case "order-placed": {
      const d = data as OrderPlacedData
      const rows = (d.items ?? [])
        .map(
          (i) =>
            `<tr><td>${esc(i.title)}</td><td align="right">${esc(
              i.quantity
            )}</td></tr>`
        )
        .join("")
      return {
        subject: `Your Saludlink order #${esc(d.display_id)}`,
        html: `<p>Thank you for your order.</p>
<p>Order <strong>#${esc(d.display_id)}</strong> (${esc(
          (d.currency_code ?? "").toUpperCase()
        )})</p>
<table role="presentation" width="100%">${rows}</table>
${claimKeyBlock(d.mcm_claim_key)}<p>We will email you again when it ships.</p>`,
      }
    }
    case "contact-form": {
      const d = data as ContactFormData
      return {
        subject: `Contact form — ${esc(d.topic)}`,
        html: `<p><strong>From:</strong> ${esc(d.name)} &lt;${esc(
          d.email
        )}&gt;</p>
<p><strong>Phone:</strong> ${esc(d.phone ?? "—")}</p>
<p><strong>Topic:</strong> ${esc(d.topic)}</p>
<p><strong>Message:</strong></p>
<p>${esc(d.message).replace(/\n/g, "<br/>")}</p>`,
      }
    }
    default:
      return null
  }
}

/**
 * Resend notification provider (replaces the former AWS SES provider).
 *
 * Medusa v2 ships no first-party Resend provider, so this is a local provider
 * module registered from `medusa-config.ts` when RESEND_API_KEY + RESEND_FROM
 * are set. It talks to Resend's REST API with the runtime's global `fetch`, so
 * it adds no dependency.
 *
 * PHI boundary: order emails name health products, so neither the recipient
 * address nor the rendered body is ever logged here. Errors surface as thrown
 * messages carrying only Resend's status — callers (the order subscriber, the
 * contact route) already fail soft.
 *
 * A signed Resend BAA is required before real sends in production (task 39).
 */
class ResendNotificationProviderService extends AbstractNotificationProviderService {
  static identifier = "resend"

  static validateOptions(options: Record<string, unknown>): void {
    if (!options.apiKey) {
      throw new Error("Resend notification provider requires `apiKey`.")
    }
    if (!options.from) {
      throw new Error("Resend notification provider requires `from`.")
    }
  }

  protected readonly options_: ResendOptions

  constructor(_container: unknown, options: ResendOptions) {
    super()
    this.options_ = options
  }

  async send(
    notification: ProviderSendNotificationDTO
  ): Promise<ProviderSendNotificationResultsDTO> {
    const rendered = render(
      notification.template,
      (notification.data ?? {}) as Record<string, unknown>
    )

    if (!rendered) {
      throw new Error(
        `Resend provider has no template named "${notification.template}".`
      )
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.options_.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: notification.from || this.options_.from,
        to: [notification.to],
        subject: rendered.subject,
        html: rendered.html,
      }),
    })

    if (!res.ok) {
      // Status only — the response body can echo the recipient address.
      throw new Error(`Resend send failed with status ${res.status}.`)
    }

    const body = (await res.json()) as { id?: string }
    return { id: body.id }
  }
}

export default ResendNotificationProviderService
