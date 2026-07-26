"use client"

import Back from "@modules/common/icons/back"
import FastDelivery from "@modules/common/icons/fast-delivery"
import Refresh from "@modules/common/icons/refresh"

import Accordion from "./accordion"
import { HttpTypes } from "@medusajs/types"

type ProductTabsProps = {
  product: HttpTypes.StoreProduct
}

/** Read a string metadata field (Medusa metadata is loosely typed). */
const metaStr = (
  metadata: HttpTypes.StoreProduct["metadata"],
  key: string
): string | undefined => {
  const value = (metadata ?? {})[key as keyof typeof metadata]
  return typeof value === "string" && value.trim() ? value.trim() : undefined
}

const ProductTabs = ({ product }: ProductTabsProps) => {
  const ingredients = metaStr(product.metadata, "active_ingredients")
  const warnings = metaStr(product.metadata, "usage_warnings")
  const fdaStatus = metaStr(product.metadata, "fda_status")

  const tabs: { label: string; component: React.ReactNode }[] = []

  if (ingredients) {
    tabs.push({
      label: "Ingredients & allergens",
      component: <PlainTextTab text={ingredients} />,
    })
  }

  if (warnings) {
    tabs.push({
      label: "Directions & safety",
      component: <PlainTextTab text={warnings} />,
    })
  }

  // Fall back to physical attributes only when there's no supplement content,
  // so device/equipment SKUs still show something useful.
  if (!ingredients && !warnings) {
    tabs.push({
      label: "Product details",
      component: <ProductDetailsTab product={product} />,
    })
  }

  tabs.push({ label: "Shipping & returns", component: <ShippingInfoTab /> })

  return (
    <div className="w-full">
      <Accordion type="multiple" defaultValue={[tabs[0]?.label]}>
        {tabs.map((tab) => (
          <Accordion.Item
            key={tab.label}
            title={tab.label}
            headingSize="medium"
            value={tab.label}
          >
            {tab.component}
          </Accordion.Item>
        ))}
      </Accordion>

      {/* Regulatory fine print — kept visible, not hidden in an accordion */}
      {fdaStatus && (
        <p className="mt-4 rounded-lg bg-sand-50 p-4 text-xs leading-relaxed text-ink-subtle">
          {fdaStatus}
        </p>
      )}
    </div>
  )
}

const PlainTextTab = ({ text }: { text: string }) => (
  <p className="whitespace-pre-line text-sm leading-relaxed text-ink-muted">
    {text}
  </p>
)

const ProductDetailsTab = ({ product }: ProductTabsProps) => {
  const rows: { label: string; value: string }[] = [
    { label: "Weight", value: product.weight ? `${product.weight} g` : "—" },
    {
      label: "Dimensions",
      value:
        product.length && product.width && product.height
          ? `${product.length}L × ${product.width}W × ${product.height}H`
          : "—",
    },
    { label: "Type", value: product.type?.value || "—" },
    {
      label: "Country of origin",
      value: product.origin_country || "—",
    },
  ]

  return (
    <dl className="grid grid-cols-1 gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
      {rows.map((row) => (
        <div
          key={row.label}
          className="flex items-center justify-between gap-4 border-b border-line/60 py-1.5"
        >
          <dt className="text-ink-subtle">{row.label}</dt>
          <dd className="font-medium text-ink">{row.value}</dd>
        </div>
      ))}
    </dl>
  )
}

const ShippingInfoTab = () => {
  const items = [
    {
      icon: <FastDelivery />,
      title: "Fast delivery",
      body: "Your order arrives in 3–5 business days, shipped discreetly to your door.",
    },
    {
      icon: <Refresh />,
      title: "Simple exchanges",
      body: "Not quite right? We'll help you exchange it for something that fits your plan.",
    },
    {
      icon: <Back />,
      title: "Easy returns",
      body: "Return unopened items within 30 days for a refund — no hassle, no questions asked.",
    },
  ]

  return (
    <div className="flex flex-col gap-y-5 pt-1 text-sm">
      {items.map((item) => (
        <div key={item.title} className="flex items-start gap-x-3">
          <span className="mt-0.5 text-evergreen-600">{item.icon}</span>
          <div>
            <span className="font-medium text-ink">{item.title}</span>
            <p className="mt-0.5 max-w-sm text-ink-muted">{item.body}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

export default ProductTabs
