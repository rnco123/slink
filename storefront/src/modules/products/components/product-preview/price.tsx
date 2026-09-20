import { Text, clx } from "@medusajs/ui"
import { VariantPrice } from "types/global"

export default async function PreviewPrice({ price }: { price: VariantPrice }) {
  if (!price) {
    return null
  }

  const onSale = price.price_type === "sale"

  return (
    <div className="flex items-baseline gap-x-2">
      {onSale && (
        <Text
          className="text-ink-subtle line-through"
          data-testid="original-price"
        >
          {price.original_price}
        </Text>
      )}
      <Text
        className={clx(
          "font-semibold",
          onSale ? "text-clay-600" : "text-evergreen-800"
        )}
        data-testid="price"
      >
        {price.calculated_price}
      </Text>
    </div>
  )
}
