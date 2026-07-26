import { Dialog, Transition } from "@headlessui/react"
import { clx } from "@medusajs/ui"
import React, { Fragment, useMemo } from "react"

import useToggleState from "@lib/hooks/use-toggle-state"
import ChevronDown from "@modules/common/icons/chevron-down"
import X from "@modules/common/icons/x"

import { getProductPrice } from "@lib/util/get-product-price"
import OptionSelect from "./option-select"
import { HttpTypes } from "@medusajs/types"
import { isSimpleProduct } from "@lib/util/product"

type MobileActionsProps = {
  product: HttpTypes.StoreProduct
  variant?: HttpTypes.StoreProductVariant
  options: Record<string, string | undefined>
  updateOptions: (title: string, value: string) => void
  inStock?: boolean
  handleAddToCart: () => void
  isAdding?: boolean
  show: boolean
  optionsDisabled: boolean
}

const MobileActions: React.FC<MobileActionsProps> = ({
  product,
  variant,
  options,
  updateOptions,
  inStock,
  handleAddToCart,
  isAdding,
  show,
  optionsDisabled,
}) => {
  const { state, open, close } = useToggleState()

  const price = getProductPrice({
    product: product,
    variantId: variant?.id,
  })

  const selectedPrice = useMemo(() => {
    if (!price) {
      return null
    }
    const { variantPrice, cheapestPrice } = price

    return variantPrice || cheapestPrice || null
  }, [price])

  const isSimple = isSimpleProduct(product)

  return (
    <>
      <div
        className={clx("lg:hidden inset-x-0 bottom-0 fixed z-50", {
          "pointer-events-none": !show,
        })}
      >
        <Transition
          as={Fragment}
          show={show}
          enter="ease-in-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-300"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div
            className="flex w-full flex-col gap-y-2.5 border-t border-line bg-cream/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-lg backdrop-blur supports-[backdrop-filter]:bg-cream/85"
            data-testid="mobile-actions"
          >
            <div className="flex items-center justify-between gap-x-2 px-1">
              <span
                className="truncate text-sm font-medium text-ink"
                data-testid="mobile-title"
              >
                {product.title}
              </span>
              {selectedPrice ? (
                <div className="flex shrink-0 items-center gap-x-2">
                  {selectedPrice.price_type === "sale" && (
                    <span className="text-sm text-ink-subtle line-through">
                      {selectedPrice.original_price}
                    </span>
                  )}
                  <span
                    className={clx(
                      "text-base font-semibold",
                      selectedPrice.price_type === "sale"
                        ? "text-clay-600"
                        : "text-evergreen-800"
                    )}
                  >
                    {selectedPrice.calculated_price}
                  </span>
                </div>
              ) : (
                <div></div>
              )}
            </div>
            <div
              className={clx("grid w-full grid-cols-2 gap-x-3", {
                "!grid-cols-1": isSimple,
              })}
            >
              {!isSimple && (
                <button
                  onClick={open}
                  className="flex h-12 items-center justify-between gap-1 rounded-pill border border-line-strong bg-white px-4 text-sm font-medium text-ink transition-colors hover:bg-sand-50"
                  data-testid="mobile-actions-button"
                >
                  <span className="truncate">
                    {variant
                      ? Object.values(options).join(" / ")
                      : "Select options"}
                  </span>
                  <ChevronDown />
                </button>
              )}
              <button
                onClick={handleAddToCart}
                disabled={!inStock || !variant || isAdding}
                className="flex h-12 items-center justify-center rounded-pill bg-evergreen-700 px-6 text-sm font-semibold text-cream transition-colors hover:bg-evergreen-800 disabled:bg-sand-400 disabled:text-cream/80"
                data-testid="mobile-cart-button"
              >
                {isAdding
                  ? "Adding…"
                  : !variant
                  ? "Select variant"
                  : !inStock
                  ? "Out of stock"
                  : "Add to cart"}
              </button>
            </div>
          </div>
        </Transition>
      </div>
      <Transition appear show={state} as={Fragment}>
        <Dialog as="div" className="relative z-[75]" onClose={close}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-ink/60 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed bottom-0 inset-x-0">
            <div className="flex min-h-full h-full items-center justify-center text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 translate-y-4"
                enterTo="opacity-100 translate-y-0"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 translate-y-0"
                leaveTo="opacity-0 translate-y-4"
              >
                <Dialog.Panel
                  className="w-full transform overflow-hidden rounded-t-xl bg-cream text-left"
                  data-testid="mobile-actions-modal"
                >
                  <div className="flex items-center justify-between border-b border-line px-5 py-4">
                    <span className="font-display text-lg text-evergreen-800">
                      Select options
                    </span>
                    <button
                      onClick={close}
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-ink transition-colors hover:bg-sand-100"
                      data-testid="close-modal-button"
                    >
                      <X />
                    </button>
                  </div>
                  <div className="px-5 py-6">
                    {(product.variants?.length ?? 0) > 1 && (
                      <div className="flex flex-col gap-y-6">
                        {(product.options || []).map((option) => {
                          return (
                            <div key={option.id}>
                              <OptionSelect
                                option={option}
                                current={options[option.id]}
                                updateOption={updateOptions}
                                title={option.title ?? ""}
                                disabled={optionsDisabled}
                              />
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  )
}

export default MobileActions
