import { Suspense } from "react"

import SkeletonProductGrid from "@modules/skeletons/templates/skeleton-product-grid"
import RefinementList from "@modules/store/components/refinement-list"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"

import PaginatedProducts from "./paginated-products"

const StoreTemplate = ({
  sortBy,
  page,
  countryCode,
}: {
  sortBy?: SortOptions
  page?: string
  countryCode: string
}) => {
  const pageNumber = page ? parseInt(page) : 1
  const sort = sortBy || "created_at"

  return (
    <div
      /* `content-container` (from the Medusa starter) no longer exists — it was
         dropped in the rebrand, so commerce pages had NO max-width and NO
         horizontal padding and ran edge-to-edge. Use the design-system container
         the branded pages use: `max-w-container` + the standard page gutters. */
      className="mx-auto flex max-w-container flex-col gap-8 px-6 py-10 small:flex-row small:items-start md:px-8"
      data-testid="category-container"
    >
      <RefinementList sortBy={sort} />
      {/* `flex-1 min-w-0` — NOT `w-full`. As a flex item beside the refinement
          sidebar, width:100% resolves against the row and pushes the grid past
          the container, which clipped the last column. min-w-0 lets the grid
          actually shrink instead of forcing overflow. */}
      <div className="min-w-0 flex-1">
        <div className="mb-8">
          <h1
            className="font-display text-2xl font-semibold text-evergreen-800"
            data-testid="store-page-title"
          >
            All products
          </h1>
        </div>
        <Suspense fallback={<SkeletonProductGrid />}>
          <PaginatedProducts
            sortBy={sort}
            page={pageNumber}
            countryCode={countryCode}
          />
        </Suspense>
      </div>
    </div>
  )
}

export default StoreTemplate
