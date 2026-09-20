"use server"

import { sdk } from "@lib/config"

/** Bank details the customer transfers to. Served by the backend, never baked
 *  into the storefront build — see backend/src/api/store/config/route.ts. */
export type BankTransferDetails = {
  bankName: string
  accountName: string
  accountNumber: string
  routingNumber: string
  instructions: string
}

export type StorefrontConfig = {
  payment: {
    method: "bank_transfer"
    /** False when the backend has no bank details set — checkout must not ask
     *  someone to transfer money to a blank account. */
    configured: boolean
    bank: BankTransferDetails
  }
}

const EMPTY: StorefrontConfig = {
  payment: {
    method: "bank_transfer",
    configured: false,
    bank: {
      bankName: "",
      accountName: "",
      accountNumber: "",
      routingNumber: "",
      instructions: "",
    },
  },
}

/**
 * Runtime configuration owned by the backend.
 *
 * The storefront carries one URL (`MEDUSA_BACKEND_URL`) and the publishable key
 * that authenticates to it; everything vendor-specific comes from here, so
 * rotating a detail is a backend variable change and not a storefront rebuild.
 *
 * Fails soft: on any error we return an unconfigured payload, and the checkout
 * UI shows "payment details unavailable" rather than throwing on the cart page.
 */
export const getStorefrontConfig = async (): Promise<StorefrontConfig> => {
  return sdk.client
    .fetch<StorefrontConfig>(`/store/config`, {
      method: "GET",
      // Short revalidate: bank details change rarely, but a correction should
      // reach the checkout without waiting for a redeploy.
      next: { revalidate: 60, tags: ["storefront-config"] },
    })
    .catch(() => EMPTY)
}
