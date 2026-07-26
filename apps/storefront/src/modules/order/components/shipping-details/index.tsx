import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"
import { Heading, Text } from "@medusajs/ui"

type ShippingDetailsProps = {
  order: HttpTypes.StoreOrder
}

const ShippingDetails = ({ order }: ShippingDetailsProps) => {
  return (
    <div>
      <Heading level="h2" className="font-display text-xl text-evergreen-800">
        Delivery
      </Heading>
      <div className="mt-4 grid grid-cols-1 gap-6 rounded-xl border border-line bg-white p-5 shadow-sm sm:grid-cols-3 sm:p-6">
        <div className="min-w-0" data-testid="shipping-address-summary">
          <Text className="mb-1 text-sm font-medium text-ink">
            Shipping Address
          </Text>
          <Text className="break-words text-sm text-ink-muted">
            {order.shipping_address?.first_name}{" "}
            {order.shipping_address?.last_name}
          </Text>
          <Text className="break-words text-sm text-ink-muted">
            {order.shipping_address?.address_1}{" "}
            {order.shipping_address?.address_2}
          </Text>
          <Text className="break-words text-sm text-ink-muted">
            {order.shipping_address?.postal_code},{" "}
            {order.shipping_address?.city}
          </Text>
          <Text className="text-sm text-ink-muted">
            {order.shipping_address?.country_code?.toUpperCase()}
          </Text>
        </div>

        <div className="min-w-0" data-testid="shipping-contact-summary">
          <Text className="mb-1 text-sm font-medium text-ink">Contact</Text>
          <Text className="break-words text-sm text-ink-muted">
            {order.shipping_address?.phone}
          </Text>
          <Text className="break-words text-sm text-ink-muted">
            {order.email}
          </Text>
        </div>

        <div className="min-w-0" data-testid="shipping-method-summary">
          <Text className="mb-1 text-sm font-medium text-ink">Method</Text>
          <Text className="break-words text-sm text-ink-muted">
            {(order as any).shipping_methods[0]?.name} (
            {convertToLocale({
              amount: order.shipping_methods?.[0].total ?? 0,
              currency_code: order.currency_code,
            })}
            )
          </Text>
        </div>
      </div>
    </div>
  )
}

export default ShippingDetails
