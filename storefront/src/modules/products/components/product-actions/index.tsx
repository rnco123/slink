"use client"

import { addToCart } from "@lib/data/cart"
import { useIntersection } from "@lib/hooks/use-in-view"
import { captureSafeEvent } from "@saludlink/privacy"
import { HttpTypes } from "@medusajs/types"
import { clx } from "@medusajs/ui"
import OptionSelect from "@modules/products/components/product-actions/option-select"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { IconCart, IconShield, IconTruck } from "@components/ui/icons"
import Spinner from "@modules/common/icons/spinner"
import { isEqual } from "lodash"
import { useParams, usePathname, useSearchParams } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"
import ProductPrice from "../product-price"
import MobileActions from "./mobile-actions"
import { useRouter } from "next/navigation"

type ProductActionsProps = {
  product: HttpTypes.StoreProduct
  region: HttpTypes.StoreRegion
  disabled?: boolean
}

const optionsAsKeymap = (
  variantOptions: HttpTypes.StoreProductVariant["options"]
) => {
  return variantOptions?.reduce((acc: Record<string, string>, varopt: any) => {
    acc[varopt.option_id] = varopt.value
    return acc
  }, {})
}

export default function ProductActions({
  product,
  disabled,
}: ProductActionsProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [options, setOptions] = useState<Record<string, string | undefined>>({})
  const [quantity, setQuantity] = useState(1)
  const [isAdding, setIsAdding] = useState(false)
  const [justAdded, setJustAdded] = useState(false)
  const countryCode = useParams().countryCode as string

  // If there is only 1 variant, preselect the options
  useEffect(() => {
    if (product.variants?.length === 1) {
      const variantOptions = optionsAsKeymap(product.variants[0].options)
      setOptions(variantOptions ?? {})
    }
  }, [product.variants])

  const selectedVariant = useMemo(() => {
    if (!product.variants || product.variants.length === 0) {
      return
    }

    return product.variants.find((v) => {
      const variantOptions = optionsAsKeymap(v.options)
      return isEqual(variantOptions, options)
    })
  }, [product.variants, options])

  // update the options when a variant is selected
  const setOptionValue = (optionId: string, value: string) => {
    setOptions((prev) => ({
      ...prev,
      [optionId]: value,
    }))
  }

  //check if the selected options produce a valid variant
  const isValidVariant = useMemo(() => {
    return product.variants?.some((v) => {
      const variantOptions = optionsAsKeymap(v.options)
      return isEqual(variantOptions, options)
    })
  }, [product.variants, options])

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    const value = isValidVariant ? selectedVariant?.id : null

    if (params.get("v_id") === value) {
      return
    }

    if (value) {
      params.set("v_id", value)
    } else {
      params.delete("v_id")
    }

    router.replace(pathname + "?" + params.toString())
  }, [selectedVariant, isValidVariant])

  // check if the selected variant is in stock
  const inStock = useMemo(() => {
    // If we don't manage inventory, we can always add to cart
    if (selectedVariant && !selectedVariant.manage_inventory) {
      return true
    }

    // If we allow back orders on the variant, we can add to cart
    if (selectedVariant?.allow_backorder) {
      return true
    }

    // If there is inventory available, we can add to cart
    if (
      selectedVariant?.manage_inventory &&
      (selectedVariant?.inventory_quantity || 0) > 0
    ) {
      return true
    }

    // Otherwise, we can't add to cart
    return false
  }, [selectedVariant])

  const maxQuantity = useMemo(() => {
    if (
      selectedVariant?.manage_inventory &&
      !selectedVariant?.allow_backorder
    ) {
      return Math.max(1, selectedVariant?.inventory_quantity || 1)
    }
    return 99
  }, [selectedVariant])

  const actionsRef = useRef<HTMLDivElement>(null)

  const inView = useIntersection(actionsRef, "0px")

  // add the selected variant to the cart
  const handleAddToCart = async () => {
    if (!selectedVariant?.id) return null

    setIsAdding(true)

    await addToCart({
      variantId: selectedVariant.id,
      quantity,
      countryCode,
    })

    // Funnel event (task 10) — PHI-safe, IDs + price only, no free text.
    captureSafeEvent("product_added_to_cart", {
      product_id: product.id,
      variant_id: selectedVariant.id,
      quantity,
      price: selectedVariant.calculated_price?.calculated_amount ?? undefined,
      currency_code:
        selectedVariant.calculated_price?.currency_code ?? undefined,
    })

    setIsAdding(false)
    setJustAdded(true)
    window.setTimeout(() => setJustAdded(false), 2500)
  }

  const multipleVariants = (product.variants?.length ?? 0) > 1

  return (
    <div
      className="flex flex-col gap-y-6 rounded-xl border border-line bg-white p-4 shadow-sm sm:p-6"
      ref={actionsRef}
    >
      <ProductPrice product={product} variant={selectedVariant} />

      {/* Variant options */}
      {multipleVariants && (
        <div className="flex flex-col gap-y-5">
          {(product.options || []).map((option) => (
            <OptionSelect
              key={option.id}
              option={option}
              current={options[option.id]}
              updateOption={setOptionValue}
              title={option.title ?? ""}
              data-testid="product-options"
              disabled={!!disabled || isAdding}
            />
          ))}
        </div>
      )}

      {/* Quantity + Add to cart */}
      <div className="flex flex-col gap-y-3">
        <div className="flex items-stretch gap-3">
          <div className="flex items-center rounded-pill border border-line-strong bg-cream">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1 || isAdding || !!disabled}
              aria-label="Decrease quantity"
              className="flex h-12 w-11 items-center justify-center rounded-l-pill text-lg text-ink transition-colors hover:bg-sand-100 disabled:opacity-40"
            >
              −
            </button>
            <span
              className="w-9 select-none text-center text-base font-medium tabular-nums text-ink"
              aria-live="polite"
              data-testid="quantity"
            >
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.min(maxQuantity, q + 1))}
              disabled={quantity >= maxQuantity || isAdding || !!disabled}
              aria-label="Increase quantity"
              className="flex h-12 w-11 items-center justify-center rounded-r-pill text-lg text-ink transition-colors hover:bg-sand-100 disabled:opacity-40"
            >
              +
            </button>
          </div>

          <button
            onClick={handleAddToCart}
            disabled={
              !inStock ||
              !selectedVariant ||
              !!disabled ||
              isAdding ||
              !isValidVariant
            }
            className={clx(
              "flex h-12 flex-1 items-center justify-center gap-2 rounded-pill px-6 text-base font-semibold text-cream shadow-sm transition-all duration-200",
              justAdded
                ? "bg-evergreen-600"
                : "bg-evergreen-700 hover:bg-evergreen-800",
              "disabled:cursor-not-allowed disabled:bg-sand-400 disabled:text-cream/80 disabled:shadow-none"
            )}
            data-testid="add-product-button"
          >
            {isAdding ? (
              <Spinner size={18} />
            ) : justAdded ? (
              <>
                <CheckIcon />
                Added to cart
              </>
            ) : !selectedVariant && !multipleVariants ? (
              "Add to cart"
            ) : !selectedVariant ? (
              "Select an option"
            ) : !inStock || !isValidVariant ? (
              "Out of stock"
            ) : (
              <>
                <IconCart width={18} height={18} />
                Add to cart
              </>
            )}
          </button>
        </div>

        {justAdded && (
          <LocalizedClientLink
            href="/cart"
            className="text-center text-sm font-medium text-evergreen-700 underline-offset-2 hover:underline"
          >
            View cart →
          </LocalizedClientLink>
        )}

        {/* Availability micro-copy */}
        {selectedVariant && (
          <p className="flex items-center gap-2 text-sm text-ink-muted">
            <span
              className={clx(
                "inline-block h-2 w-2 rounded-full",
                inStock ? "bg-success" : "bg-error"
              )}
              aria-hidden
            />
            {inStock
              ? "In stock · ships in 3–5 business days"
              : "Currently unavailable"}
          </p>
        )}
      </div>

      {/* Trust badges */}
      <ul className="grid grid-cols-1 gap-3 border-t border-line pt-5 text-sm text-ink-muted min-[420px]:grid-cols-3">
        <li className="flex items-center gap-2">
          <IconTruck
            width={20}
            height={20}
            className="shrink-0 text-evergreen-600"
          />
          Free shipping over $50
        </li>
        <li className="flex items-center gap-2">
          <IconShield
            width={20}
            height={20}
            className="shrink-0 text-evergreen-600"
          />
          Secure checkout
        </li>
        <li className="flex items-center gap-2">
          <ReturnIcon />
          30-day returns
        </li>
      </ul>

      <MobileActions
        product={product}
        variant={selectedVariant}
        options={options}
        updateOptions={setOptionValue}
        inStock={inStock}
        handleAddToCart={handleAddToCart}
        isAdding={isAdding}
        show={!inView}
        optionsDisabled={!!disabled || isAdding}
      />
    </div>
  )
}

const CheckIcon = () => (
  <svg
    width={18}
    height={18}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d="m5 12 4.5 4.5L19 7" />
  </svg>
)

const ReturnIcon = () => (
  <svg
    width={20}
    height={20}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="shrink-0 text-evergreen-600"
    aria-hidden
  >
    <path d="M3 8a9 9 0 1 1-1.5 5" />
    <path d="M3 4v4h4" />
  </svg>
)
