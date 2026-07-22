import { listProductReviews } from "@lib/data/reviews"
import { formatDate } from "@lib/util/dates"
import ReviewStars from "./review-stars"
import ReviewForm from "./review-form"

/**
 * Product reviews section for the PDP (roadmap task 21b).
 *
 * Server component: fetches approved reviews + the aggregate summary, renders
 * the star summary, the list, and the (client) submit form. Only approved
 * reviews are ever returned by the API, so nothing unmoderated renders here.
 */
type Props = { productId: string }

const ProductReviews = async ({ productId }: Props) => {
  const { reviews, count, summary } = await listProductReviews(productId, {
    limit: 20,
  })

  return (
    <section
      className="content-container my-16 small:my-24"
      aria-labelledby="reviews-heading"
      data-testid="product-reviews"
    >
      <div className="mb-6 flex flex-col gap-2 small:flex-row small:items-center small:justify-between">
        <div>
          <h2 id="reviews-heading" className="text-2xl font-medium">
            Customer reviews
          </h2>
          {summary.count > 0 ? (
            <div className="mt-1 flex items-center gap-2">
              <ReviewStars
                value={summary.average}
                size="medium"
                showValue
                count={summary.count}
              />
            </div>
          ) : (
            <p className="text-ui-fg-subtle mt-1 text-sm">
              No reviews yet — be the first to share your experience.
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 small:grid-cols-2">
        {/* Reviews list */}
        <div className="flex flex-col gap-4" data-testid="review-list">
          {count === 0 ? (
            <p className="text-ui-fg-subtle text-sm">
              There are no approved reviews for this product yet.
            </p>
          ) : (
            reviews.map((r) => (
              <article
                key={r.id}
                className="border-b border-ui-border-base pb-4"
                data-testid="review-item"
              >
                <div className="mb-1 flex items-center gap-2">
                  <ReviewStars value={r.rating} size="small" />
                  {r.verified_purchase && (
                    <span className="rounded bg-green-50 px-1.5 py-0.5 text-xs font-medium text-green-700">
                      Verified purchase
                    </span>
                  )}
                </div>
                {r.title && <p className="font-medium">{r.title}</p>}
                <p className="text-ui-fg-subtle mt-1 whitespace-pre-wrap text-sm">
                  {r.content}
                </p>
                <p className="text-ui-fg-muted mt-2 text-xs">
                  {r.display_name}
                  {r.created_at ? ` · ${formatDate(r.created_at)}` : ""}
                </p>
              </article>
            ))
          )}
        </div>

        {/* Submit form */}
        <div>
          <ReviewForm productId={productId} />
        </div>
      </div>
    </section>
  )
}

export default ProductReviews
