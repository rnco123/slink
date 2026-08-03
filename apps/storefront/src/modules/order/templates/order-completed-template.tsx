import { CheckCircleSolid } from "@medusajs/icons"
import { Heading } from "@medusajs/ui"
import { cookies as nextCookies } from "next/headers"

import CartTotals from "@modules/common/components/cart-totals"
import Help from "@modules/order/components/help"
import Items from "@modules/order/components/items"
import OnboardingCta from "@modules/order/components/onboarding-cta"
import OrderDetails from "@modules/order/components/order-details"
import ShippingDetails from "@modules/order/components/shipping-details"
import PaymentDetails from "@modules/order/components/payment-details"
import { HttpTypes } from "@medusajs/types"

type OrderCompletedTemplateProps = {
  order: HttpTypes.StoreOrder
}

export default async function OrderCompletedTemplate({
  order,
}: OrderCompletedTemplateProps) {
  const cookies = await nextCookies()

  const isOnboarding = cookies.get("_medusa_onboarding")?.value === "true"

  return (
    <div className="min-h-[calc(100vh-64px)] bg-cream py-6 sm:py-12">
      <div className="content-container flex w-full flex-col items-center gap-y-8">
        {isOnboarding && <OnboardingCta orderId={order.id} />}
        <div
          className="flex w-full max-w-5xl flex-col gap-6"
          data-testid="order-complete-container"
        >
          <div className="flex flex-col items-center gap-y-6 rounded-xl border border-line bg-white p-6 shadow-sm sm:p-10">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-success">
              <CheckCircleSolid className="h-4 w-4" />
              Order confirmed
            </span>
            <Heading
              level="h1"
              className="flex flex-col gap-y-1 text-center font-display text-2xl text-evergreen-800 sm:text-3xl"
            >
              <span>Thank you!</span>
              <span>Your order was placed successfully.</span>
            </Heading>
            <div className="w-full text-left">
              <OrderDetails order={order} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-y-6 lg:grid-cols-[1fr_360px] lg:gap-x-10">
            <div className="flex min-w-0 flex-col gap-y-6">
              <div>
                <h2 className="font-display text-xl text-evergreen-800">
                  Summary
                </h2>
                <div className="mt-4">
                  <Items order={order} />
                </div>
              </div>
              <ShippingDetails order={order} />
              <PaymentDetails order={order} />
            </div>
            <div className="min-w-0">
              <div className="lg:sticky lg:top-24">
                <div className="rounded-xl border border-line bg-white p-5 shadow-sm sm:p-6">
                  <CartTotals totals={order} />
                </div>
              </div>
            </div>
          </div>

          <Help />
        </div>
      </div>
    </div>
  )
}
