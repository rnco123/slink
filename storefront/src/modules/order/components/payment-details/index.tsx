import { Container, Heading, Text } from "@medusajs/ui"

import { paymentInfoMap } from "@lib/constants"
import { convertToLocale } from "@lib/util/money"
import { formatDateTime } from "@lib/util/dates"
import { HttpTypes } from "@medusajs/types"

type PaymentDetailsProps = {
  order: HttpTypes.StoreOrder
}

const PaymentDetails = ({ order }: PaymentDetailsProps) => {
  const payment = order.payment_collections?.[0].payments?.[0]

  return (
    <div>
      <Heading level="h2" className="font-display text-xl text-evergreen-800">
        Payment
      </Heading>
      {payment && (
        <div className="mt-4 rounded-xl border border-line bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="min-w-0 sm:w-1/3">
              <Text className="mb-1 text-sm font-medium text-ink">
                Payment method
              </Text>
              <Text
                className="text-sm text-ink-muted"
                data-testid="payment-method"
              >
                {paymentInfoMap[payment.provider_id]?.title ??
                  payment.provider_id}
              </Text>
            </div>
            <div className="min-w-0 sm:w-2/3">
              <Text className="mb-1 text-sm font-medium text-ink">
                Payment details
              </Text>
              <div className="flex items-center gap-2 text-sm text-ink-muted">
                <Container className="flex h-7 w-fit items-center bg-sand-50 p-2">
                  {paymentInfoMap[payment.provider_id]?.icon}
                </Container>
                <Text data-testid="payment-amount" className="break-words">
                  {`${convertToLocale({
                    amount: payment.amount,
                    currency_code: order.currency_code,
                  })} — recorded ${formatDateTime(payment.created_at)}`}
                </Text>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PaymentDetails
