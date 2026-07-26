import React, { Suspense } from "react"

import ImageGallery from "@modules/products/components/image-gallery"
import ProductActions from "@modules/products/components/product-actions"
import ProductTabs from "@modules/products/components/product-tabs"
import RelatedProducts from "@modules/products/components/related-products"
import ProductInfo from "@modules/products/templates/product-info"
import SkeletonRelatedProducts from "@modules/skeletons/templates/skeleton-related-products"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { notFound } from "next/navigation"
import { HttpTypes } from "@medusajs/types"
import type { ReviewSummary } from "@lib/data/reviews"

import ProductActionsWrapper from "./product-actions-wrapper"

type ProductTemplateProps = {
  product: HttpTypes.StoreProduct
  region: HttpTypes.StoreRegion
  countryCode: string
  images: HttpTypes.StoreProductImage[]
  reviewSummary?: ReviewSummary
}

const ProductTemplate: React.FC<ProductTemplateProps> = ({
  product,
  region,
  countryCode,
  images,
  reviewSummary,
}) => {
  if (!product || !product.id) {
    return notFound()
  }

  const category = product.categories?.[0]

  return (
    <>
      <div
        className="content-container overflow-x-hidden py-5 sm:py-8"
        data-testid="product-container"
      >
        {/* Breadcrumb — orientation + internal linking (SEO + UX) */}
        <nav aria-label="Breadcrumb" className="mb-5 sm:mb-7">
          <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-subtle">
            <li>
              <LocalizedClientLink
                href="/store"
                className="transition-colors hover:text-evergreen-700"
              >
                Shop
              </LocalizedClientLink>
            </li>
            {category && (
              <>
                <li aria-hidden className="text-line-strong">
                  /
                </li>
                <li>
                  <LocalizedClientLink
                    href={`/categories/${category.handle}`}
                    className="transition-colors hover:text-evergreen-700"
                  >
                    {category.name}
                  </LocalizedClientLink>
                </li>
              </>
            )}
            <li aria-hidden className="text-line-strong">
              /
            </li>
            <li
              className="max-w-[16rem] truncate font-medium text-ink"
              aria-current="page"
            >
              {product.title}
            </li>
          </ol>
        </nav>

        {/* Two-column PDP: gallery + sticky buy box (the e-commerce standard) */}
        <div className="grid grid-cols-1 gap-x-10 gap-y-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] xl:grid-cols-[minmax(0,1fr)_minmax(0,480px)]">
          <div className="w-full min-w-0">
            <ImageGallery images={images} title={product.title} />
          </div>

          <div className="flex w-full min-w-0 flex-col gap-y-7 lg:sticky lg:top-24 lg:self-start">
            <ProductInfo product={product} reviewSummary={reviewSummary} />

            <Suspense
              fallback={
                <ProductActions
                  disabled={true}
                  product={product}
                  region={region}
                />
              }
            >
              <ProductActionsWrapper id={product.id} region={region} />
            </Suspense>

            <ProductTabs product={product} />
          </div>
        </div>
      </div>

      <div
        className="content-container my-16 small:my-28"
        data-testid="related-products-container"
      >
        <Suspense fallback={<SkeletonRelatedProducts />}>
          <RelatedProducts product={product} countryCode={countryCode} />
        </Suspense>
      </div>
    </>
  )
}

export default ProductTemplate
