import React from "react"
import { CreditCard } from "@medusajs/icons"

/**
 * Map of payment provider_id → title + icon.
 *
 * This store takes BANK TRANSFER only. There is no card gateway: checkout uses
 * Medusa's built-in system provider (`pp_system_default`), the customer is shown
 * our bank details, transfers the money from their own bank, and confirms.
 *
 * Payment is NOT verified at checkout — orders arrive authorised but uncaptured
 * and staff reconcile them in Admin before fulfilling.
 */
export const paymentInfoMap: Record<
  string,
  { title: string; icon: React.JSX.Element }
> = {
  pp_system_default: {
    title: "Bank transfer",
    icon: <CreditCard />,
  },
}

/** The only payment method: Medusa's system provider, used as bank transfer. */
export const isBankTransfer = (providerId?: string) => {
  return providerId?.startsWith("pp_system_default")
}

// Add currencies that don't need to be divided by 100
export const noDivisionCurrencies = [
  "krw",
  "jpy",
  "vnd",
  "clp",
  "pyg",
  "xaf",
  "xof",
  "bif",
  "djf",
  "gnf",
  "kmf",
  "mga",
  "rwf",
  "xpf",
  "htg",
  "vuv",
  "xag",
  "xdr",
  "xau",
]
