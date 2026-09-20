"use client"

import { XMark } from "@medusajs/icons"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Help from "@modules/order/components/help"
import Items from "@modules/order/components/items"
import OrderDetails from "@modules/order/components/order-details"
import OrderSummary from "@modules/order/components/order-summary"
import ShippingDetails from "@modules/order/components/shipping-details"
import React from "react"

type OrderDetailsTemplateProps = {
  order: HttpTypes.StoreOrder
}

const OrderDetailsTemplate: React.FC<OrderDetailsTemplateProps> = ({
  order,
}) => {
  return (
    <div className="flex flex-col gap-y-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="font-display text-2xl text-evergreen-800 sm:text-3xl">
          Order details
        </h1>
        <LocalizedClientLink
          href="/account/orders"
          className="flex items-center gap-2 text-sm font-medium text-evergreen-700 hover:underline underline-offset-2"
          data-testid="back-to-overview-button"
        >
          <XMark /> Back to overview
        </LocalizedClientLink>
      </div>
      <div
        className="grid grid-cols-1 gap-y-6 xl:grid-cols-[1fr_320px] xl:gap-x-8"
        data-testid="order-details-container"
      >
        <div className="flex min-w-0 flex-col gap-y-6">
          <OrderDetails order={order} showStatus />
          <Items order={order} />
          <ShippingDetails order={order} />
        </div>
        <div className="min-w-0">
          <div className="xl:sticky xl:top-24">
            <OrderSummary order={order} />
          </div>
        </div>
      </div>
      <Help />
    </div>
  )
}

export default OrderDetailsTemplate
