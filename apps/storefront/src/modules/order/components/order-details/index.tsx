import { HttpTypes } from "@medusajs/types"
import { Text } from "@medusajs/ui"
import { formatDate } from "@lib/util/dates"

type OrderDetailsProps = {
  order: HttpTypes.StoreOrder
  showStatus?: boolean
}

const OrderDetails = ({ order, showStatus }: OrderDetailsProps) => {
  const formatStatus = (str: string) => {
    const formatted = str.split("_").join(" ")

    return formatted.slice(0, 1).toUpperCase() + formatted.slice(1)
  }

  return (
    <div>
      <Text className="text-sm text-ink-muted">
        We have sent the order confirmation details to{" "}
        <span className="font-semibold text-ink" data-testid="order-email">
          {order.email}
        </span>
        .
      </Text>
      <Text className="mt-2 text-sm text-ink-muted">
        Order date:{" "}
        <span data-testid="order-date">{formatDate(order.created_at)}</span>
      </Text>
      <Text className="mt-2 text-sm font-medium text-evergreen-700">
        Order number: <span data-testid="order-id">{order.display_id}</span>
      </Text>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1">
        {showStatus && (
          <>
            <Text className="text-sm text-ink-muted">
              Order status:{" "}
              <span className="text-ink-subtle" data-testid="order-status">
                {formatStatus(order.fulfillment_status)}
              </span>
            </Text>
            <Text className="text-sm text-ink-muted">
              Payment status:{" "}
              <span
                className="text-ink-subtle"
                sata-testid="order-payment-status"
              >
                {formatStatus(order.payment_status)}
              </span>
            </Text>
          </>
        )}
      </div>
    </div>
  )
}

export default OrderDetails
