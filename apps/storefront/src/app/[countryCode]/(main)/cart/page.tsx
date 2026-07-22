import { retrieveCart } from "@lib/data/cart"
import { retrieveCustomer } from "@lib/data/customer"
import CartTemplate from "@modules/cart/templates"
import TrackEvent from "@modules/analytics/track-event"
import { Metadata } from "next"
import { notFound } from "next/navigation"

export const metadata: Metadata = {
  title: "Cart",
  description: "View your cart",
}

export default async function Cart() {
  const cart = await retrieveCart().catch((error) => {
    console.error(error)
    return notFound()
  })

  const customer = await retrieveCustomer()

  return (
    <>
      {cart?.id ? (
        // Funnel event (task 10) — cart view, IDs + totals only, PHI-safe.
        <TrackEvent
          event="cart_viewed"
          payload={{
            cart_id: cart.id,
            item_count: cart.items?.length ?? 0,
            subtotal: cart.subtotal ?? undefined,
            currency_code: cart.currency_code ?? undefined,
          }}
        />
      ) : null}
      <CartTemplate cart={cart} customer={customer} />
    </>
  )
}
