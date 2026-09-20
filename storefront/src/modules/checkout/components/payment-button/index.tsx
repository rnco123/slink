"use client"

import { isBankTransfer } from "@lib/constants"
import { placeOrder } from "@lib/data/cart"
import type { StorefrontConfig } from "@lib/data/storefront-config"
import { HttpTypes } from "@medusajs/types"
import { Button, Checkbox, Label } from "@medusajs/ui"
import React, { useState } from "react"
import ErrorMessage from "../error-message"

type PaymentButtonProps = {
  cart: HttpTypes.StoreCart
  config: StorefrontConfig
  "data-testid": string
}

/**
 * Place-order control for a BANK TRANSFER checkout.
 *
 * There is no gateway to confirm against: the customer transfers the money from
 * their own bank, ticks the confirmation, and the order is placed. Nothing here
 * proves the money moved — the tick is a self-declaration.
 *
 * The order is therefore created with payment AUTHORISED but NOT CAPTURED, and
 * staff reconcile it against the bank statement in Admin before fulfilling.
 * The confirmation checkbox exists so the customer cannot place an order having
 * skipped the transfer instructions entirely, and so there is a deliberate act
 * on record — not because it verifies anything.
 *
 * Ordering is BLOCKED when the backend has no bank details configured. Without
 * them the customer is never shown an account number, so "I have sent the
 * transfer" could not possibly be true — letting the order through would record
 * a false confirmation and leave staff reconciling a payment that was never
 * sendable.
 */
const PaymentButton: React.FC<PaymentButtonProps> = ({
  cart,
  config,
  "data-testid": dataTestId,
}) => {
  const notReady =
    !cart ||
    !cart.shipping_address ||
    !cart.billing_address ||
    !cart.email ||
    (cart.shipping_methods?.length ?? 0) < 1

  const paymentSession = cart.payment_collection?.payment_sessions?.[0]

  if (!config.payment.configured) {
    return (
      <Button
        disabled
        className="!rounded-pill !bg-evergreen-700 !text-cream !shadow-none hover:!bg-evergreen-800"
        data-testid="bank-transfer-unconfigured-button"
      >
        Payment details unavailable
      </Button>
    )
  }

  if (!isBankTransfer(paymentSession?.provider_id)) {
    return (
      <Button
        disabled
        className="!rounded-pill !bg-evergreen-700 !text-cream !shadow-none hover:!bg-evergreen-800"
      >
        Select a payment method
      </Button>
    )
  }

  return (
    <BankTransferPaymentButton notReady={notReady} data-testid={dataTestId} />
  )
}

const BankTransferPaymentButton = ({
  notReady,
  "data-testid": dataTestId,
}: {
  notReady: boolean
  "data-testid"?: string
}) => {
  const [submitting, setSubmitting] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handlePayment = async () => {
    setSubmitting(true)
    await placeOrder()
      .catch((err) => {
        setErrorMessage(err.message)
      })
      .finally(() => {
        setSubmitting(false)
      })
  }

  return (
    <>
      <div className="mb-4 flex items-start gap-x-2">
        <Checkbox
          id="bank-transfer-confirmed"
          checked={confirmed}
          onCheckedChange={(v) => setConfirmed(v === true)}
          data-testid="bank-transfer-confirm-checkbox"
        />
        <Label
          htmlFor="bank-transfer-confirmed"
          className="!text-ui-fg-subtle cursor-pointer text-small-regular"
        >
          I have sent the bank transfer for the total shown, using my order
          reference.
        </Label>
      </div>
      <Button
        disabled={notReady || !confirmed}
        isLoading={submitting}
        onClick={handlePayment}
        size="large"
        className="!rounded-pill !bg-evergreen-700 !text-cream !shadow-none hover:!bg-evergreen-800"
        data-testid={dataTestId || "submit-order-button"}
      >
        Place order
      </Button>
      <ErrorMessage
        error={errorMessage}
        data-testid="bank-transfer-payment-error-message"
      />
    </>
  )
}

export default PaymentButton
