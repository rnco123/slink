"use client"

import { Text, clx } from "@medusajs/ui"
import type { StorefrontConfig } from "@lib/data/storefront-config"
import { convertToLocale } from "@lib/util/money"

/**
 * The bank details the customer transfers to, shown once bank transfer is the
 * selected payment method.
 *
 * The values come from the backend (`GET /store/config`), never from the
 * storefront build, so correcting an account number is a backend variable change
 * that takes effect on the next revalidation.
 *
 * When the backend has no details configured we say so plainly instead of
 * rendering blank fields — a customer must never be asked to transfer money to
 * an empty account number.
 */
const Row = ({ label, value }: { label: string; value: string }) => {
  if (!value) return null
  return (
    <div className="flex items-baseline justify-between gap-x-4 py-1">
      <Text className="text-sm text-ink-muted">{label}</Text>
      <Text className="text-sm font-medium text-ink tabular-nums break-all text-right">
        {value}
      </Text>
    </div>
  )
}

const BankTransferDetails = ({
  config,
  total,
  currencyCode,
}: {
  config: StorefrontConfig
  total?: number | null
  currencyCode?: string | null
}) => {
  const { configured, bank } = config.payment

  if (!configured) {
    return (
      <div
        className="my-4 rounded-lg border border-amber-300 bg-amber-50 p-4"
        data-testid="bank-transfer-unavailable"
      >
        <Text className="text-sm text-ink">
          Bank transfer details are not available right now. Please contact
          support before placing your order.
        </Text>
      </div>
    )
  }

  return (
    <div
      className={clx("my-4 rounded-lg border border-line bg-sand-50 p-4")}
      data-testid="bank-transfer-details"
    >
      <Text className="mb-2 text-sm font-semibold text-ink">
        Transfer the total to this account
      </Text>

      <div className="divide-y divide-line/60">
        <Row label="Bank" value={bank.bankName} />
        <Row label="Account name" value={bank.accountName} />
        <Row label="Account number" value={bank.accountNumber} />
        <Row label="Routing number" value={bank.routingNumber} />
        {typeof total === "number" && (
          <Row
            label="Amount"
            value={convertToLocale({
              amount: total,
              currency_code: currencyCode ?? "usd",
            })}
          />
        )}
      </div>

      {bank.instructions && (
        <Text className="mt-3 text-sm text-ink-muted">{bank.instructions}</Text>
      )}

      <Text className="mt-3 text-xs text-ink-muted">
        Your order is placed once you confirm the transfer, and is dispatched
        after we see the funds arrive. Transfers usually take 1–3 business days.
      </Text>
    </div>
  )
}

export default BankTransferDetails
