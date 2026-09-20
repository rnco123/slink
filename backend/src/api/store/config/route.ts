import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CONTENT_MODULE } from "../../../modules/content"
import type ContentModuleService from "../../../modules/content/service"

/**
 * Storefront runtime configuration.
 *
 * The backend owns every integration, so the storefront does NOT carry an env
 * var per vendor. It knows one URL (`MEDUSA_BACKEND_URL`) plus the publishable
 * key that authenticates to it, and asks this route for the rest at render time.
 *
 * Today that is the bank-transfer details shown at checkout. Anything else the
 * storefront needs from a backend-owned integration belongs here too, so there
 * stays exactly one place to look.
 *
 * SOURCE OF TRUTH: the `bank_transfer` site setting, editable in Admin under
 * Site Settings. Env (`BANK_TRANSFER_*`) is a fallback only, so an existing
 * deploy keeps working until someone saves the details in Admin — after which
 * correcting an account number is an Admin edit, not a redeploy.
 *
 * SAFETY: everything returned here reaches the browser. Only ever put values in
 * this payload that are safe to publish — our own bank details are (they are
 * what a customer must be told in order to pay us), API secrets are not.
 *
 * Cache: short public cache, but it must stay short — an Admin correction has
 * to reach checkout quickly.
 */

type BankDetails = {
  bankName: string
  accountName: string
  accountNumber: string
  routingNumber: string
  instructions: string
}

const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "")

const fromEnv = (): BankDetails => ({
  bankName: str(process.env.BANK_TRANSFER_BANK_NAME),
  accountName: str(process.env.BANK_TRANSFER_ACCOUNT_NAME),
  accountNumber: str(process.env.BANK_TRANSFER_ACCOUNT_NUMBER),
  routingNumber: str(process.env.BANK_TRANSFER_ROUTING_NUMBER),
  instructions: str(process.env.BANK_TRANSFER_INSTRUCTIONS),
})

/** Admin-saved setting wins field by field; a blank field falls back to env. */
const merge = (
  saved: Record<string, unknown>,
  env: BankDetails
): BankDetails => ({
  bankName: str(saved.bankName) || env.bankName,
  accountName: str(saved.accountName) || env.accountName,
  accountNumber: str(saved.accountNumber) || env.accountNumber,
  routingNumber: str(saved.routingNumber) || env.routingNumber,
  instructions: str(saved.instructions) || env.instructions,
})

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const env = fromEnv()
  let bank = env

  // Fail soft: if the content module is unavailable we still serve env values
  // rather than 500 the checkout page.
  try {
    const content: ContentModuleService = req.scope.resolve(CONTENT_MODULE)
    const [setting] = await content.listSiteSettings({ key: "bank_transfer" })
    const saved = setting?.value
    if (saved && typeof saved === "object") {
      bank = merge(saved as Record<string, unknown>, env)
    }
  } catch {
    // keep env values
  }

  // `configured` lets the storefront tell "no bank details set up yet" apart
  // from "details are set but blank", so checkout can refuse to ask someone to
  // transfer money into the void.
  const configured = Boolean(
    bank.bankName && bank.accountName && bank.accountNumber
  )

  res.set("Cache-Control", "public, max-age=60, stale-while-revalidate=300")
  res.json({
    payment: {
      method: "bank_transfer" as const,
      configured,
      bank,
    },
  })
}
