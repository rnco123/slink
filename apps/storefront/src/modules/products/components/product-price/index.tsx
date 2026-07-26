import { clx } from "@medusajs/ui"

import { getProductPrice } from "@lib/util/get-product-price"
import { HttpTypes } from "@medusajs/types"

export default function ProductPrice({
  product,
  variant,
}: {
  product: HttpTypes.StoreProduct
  variant?: HttpTypes.StoreProductVariant
}) {
  const { cheapestPrice, variantPrice } = getProductPrice({
    product,
    variantId: variant?.id,
  })

  const selectedPrice = variant ? variantPrice : cheapestPrice

  if (!selectedPrice) {
    return <div className="h-9 w-32 animate-pulse rounded bg-sand-100" />
  }

  const onSale = selectedPrice.price_type === "sale"

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        {!variant && (
          <span className="text-sm font-medium text-ink-subtle">From</span>
        )}
        <span
          className={clx(
            "font-display text-2xl leading-none sm:text-3xl",
            onSale ? "text-clay-600" : "text-evergreen-800"
          )}
          data-testid="product-price"
          data-value={selectedPrice.calculated_price_number}
        >
          {selectedPrice.calculated_price}
        </span>

        {onSale && (
          <>
            <span
              className="text-lg text-ink-subtle line-through"
              data-testid="original-product-price"
              data-value={selectedPrice.original_price_number}
            >
              {selectedPrice.original_price}
            </span>
            <span className="rounded-pill bg-clay-50 px-2.5 py-1 text-xs font-semibold text-clay-600">
              Save {selectedPrice.percentage_diff}%
            </span>
          </>
        )}
      </div>
      <p className="text-xs text-ink-subtle">Tax included where applicable.</p>
    </div>
  )
}
