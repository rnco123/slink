import { retrieveOrder } from "@lib/data/orders"
import OrderCompletedTemplate from "@modules/order/templates/order-completed-template"
import TrackEvent from "@modules/analytics/track-event"
import { Metadata } from "next"
import { notFound } from "next/navigation"

type Props = {
  params: Promise<{ id: string }>
}
export const metadata: Metadata = {
  title: "Order Confirmed",
  description: "You purchase was successful",
}

export default async function OrderConfirmedPage(props: Props) {
  const params = await props.params
  const order = await retrieveOrder(params.id).catch(() => null)

  if (!order) {
    return notFound()
  }

  return (
    <>
      {/* Purchase conversion event (task 10) — IDs + totals only, PHI-safe. */}
      <TrackEvent
        event="order_completed"
        payload={{
          order_id: order.id,
          value: order.total ?? 0,
          currency_code: order.currency_code ?? "usd",
          item_count: order.items?.length ?? 0,
        }}
      />
      <OrderCompletedTemplate order={order} />
    </>
  )
}
