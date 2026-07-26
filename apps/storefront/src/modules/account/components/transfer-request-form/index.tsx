"use client"

import { useActionState } from "react"
import { createTransferRequest } from "@lib/data/orders"
import { Text, IconButton } from "@medusajs/ui"
import Input from "@modules/common/components/input"
import { SubmitButton } from "@modules/checkout/components/submit-button"
import { CheckCircleMiniSolid, XCircleSolid } from "@medusajs/icons"
import { useEffect, useState } from "react"

export default function TransferRequestForm() {
  const [showSuccess, setShowSuccess] = useState(false)

  const [state, formAction] = useActionState(createTransferRequest, {
    success: false,
    error: null,
    order: null,
  })

  useEffect(() => {
    if (state.success && state.order) {
      setShowSuccess(true)
    }
  }, [state.success, state.order])

  return (
    <div className="flex w-full flex-col gap-y-4">
      <div className="grid w-full items-center gap-x-8 gap-y-4 sm:grid-cols-2">
        <div className="flex flex-col gap-y-1">
          <h3 className="font-display text-lg text-evergreen-800">
            Order transfers
          </h3>
          <Text className="text-sm text-ink-muted">
            Can&apos;t find the order you are looking for?
            <br /> Connect an order to your account.
          </Text>
        </div>
        <form
          action={formAction}
          className="flex flex-col gap-y-1 sm:items-end"
        >
          <div className="flex w-full flex-col gap-y-2">
            <Input label="Order ID" name="order_id" />
            <SubmitButton
              variant="secondary"
              className="!h-11 w-fit whitespace-nowrap self-end !rounded-pill !border-line-strong !bg-white !text-ink hover:!bg-sand-50"
            >
              Request transfer
            </SubmitButton>
          </div>
        </form>
      </div>
      {!state.success && state.error && (
        <Text className="text-right text-sm text-error">{state.error}</Text>
      )}
      {showSuccess && (
        <div className="flex w-full flex-wrap items-center justify-between gap-3 self-stretch rounded-xl border border-line bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-center gap-x-2">
            <CheckCircleMiniSolid className="h-4 w-4 text-success" />
            <div className="flex flex-col gap-y-1">
              <Text className="text-sm font-medium text-ink">
                Transfer for order {state.order?.id} requested
              </Text>
              <Text className="text-sm text-ink-muted">
                Transfer request email sent to {state.order?.email}
              </Text>
            </div>
          </div>
          <IconButton
            variant="transparent"
            className="h-fit"
            onClick={() => setShowSuccess(false)}
          >
            <XCircleSolid className="h-4 w-4 text-ink-muted" />
          </IconButton>
        </div>
      )}
    </div>
  )
}
