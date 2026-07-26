import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import ReviewStars from "@modules/products/components/product-reviews/review-stars"
import type { ReviewSummary } from "@lib/data/reviews"

type ProductInfoProps = {
  product: HttpTypes.StoreProduct
  reviewSummary?: ReviewSummary
}

const ProductInfo = ({ product, reviewSummary }: ProductInfoProps) => {
  const category = product.categories?.[0]
  const eyebrow = category?.name ?? product.collection?.title
  const eyebrowHref = category
    ? `/categories/${category.handle}`
    : product.collection
    ? `/collections/${product.collection.handle}`
    : undefined

  return (
    <div id="product-info" className="flex flex-col gap-y-4">
      {eyebrow &&
        (eyebrowHref ? (
          <LocalizedClientLink
            href={eyebrowHref}
            className="text-xs font-semibold uppercase tracking-[0.14em] text-evergreen-600 transition-colors hover:text-evergreen-700"
          >
            {eyebrow}
          </LocalizedClientLink>
        ) : (
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-evergreen-600">
            {eyebrow}
          </span>
        ))}

      <h1
        className="font-display text-2xl leading-tight text-evergreen-800 [text-wrap:balance] sm:text-3xl lg:text-[2.5rem]"
        data-testid="product-title"
      >
        {product.title}
      </h1>

      {/* Social proof — rating sits right under the title, linking to reviews */}
      {reviewSummary && reviewSummary.count > 0 ? (
        <a
          href="#reviews-heading"
          className="inline-flex w-fit items-center gap-2 text-sm text-ink-muted transition-colors hover:text-evergreen-700"
        >
          <ReviewStars value={reviewSummary.average} size="small" />
          <span className="font-medium text-ink">
            {reviewSummary.average.toFixed(1)}
          </span>
          <span className="text-ink-subtle">
            ({reviewSummary.count} review{reviewSummary.count === 1 ? "" : "s"})
          </span>
        </a>
      ) : (
        <a
          href="#reviews-heading"
          className="w-fit text-sm text-ink-subtle underline-offset-2 transition-colors hover:text-evergreen-700 hover:underline"
        >
          No reviews yet — be the first
        </a>
      )}

      {product.description && (
        <p
          className="mt-1 whitespace-pre-line text-base leading-relaxed text-ink-muted"
          data-testid="product-description"
        >
          {product.description}
        </p>
      )}
    </div>
  )
}

export default ProductInfo
