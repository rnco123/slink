import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"

type OrderSummaryProps = {
  order: HttpTypes.StoreOrder
}

const OrderSummary = ({ order }: OrderSummaryProps) => {
  const getAmount = (amount?: number | null) => {
    if (!amount) {
      return
    }

    return convertToLocale({
      amount,
      currency_code: order.currency_code,
    })
  }

  return (
    <div className="rounded-xl border border-line bg-white p-5 shadow-sm sm:p-6">
      <h2 className="font-display text-xl text-evergreen-800">Order Summary</h2>
      <div className="my-4 flex flex-col gap-y-2 text-sm text-ink-muted">
        <div className="flex items-center justify-between text-ink">
          <span className="font-medium">Subtotal</span>
          <span>{getAmount(order.subtotal)}</span>
        </div>
        {order.discount_total > 0 && (
          <div className="flex items-center justify-between">
            <span>Discount</span>
            <span>- {getAmount(order.discount_total)}</span>
          </div>
        )}
        {order.gift_card_total > 0 && (
          <div className="flex items-center justify-between">
            <span>Discount</span>
            <span>- {getAmount(order.gift_card_total)}</span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <span>Shipping</span>
          <span>{getAmount(order.shipping_total)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Taxes</span>
          <span>{getAmount(order.tax_total)}</span>
        </div>
      </div>
      <div className="h-px w-full border-b border-dashed border-line" />
      <div className="mt-4 flex items-center justify-between">
        <span className="text-base font-medium text-ink">Total</span>
        <span className="font-display text-2xl text-evergreen-800">
          {getAmount(order.total)}
        </span>
      </div>
    </div>
  )
}

export default OrderSummary
