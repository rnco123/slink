import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import ReviewStars from "@modules/products/components/product-reviews/review-stars"
import type { ReviewSummary } from "@lib/data/reviews"

type ProductInfoProps = {
  product: HttpTypes.StoreProduct
  reviewSummary?: ReviewSummary
  /** Lead paragraph (first paragraph of the description); the rest renders in ProductAbout. */
  lead?: string
}

/** Read a boolean-ish metadata field — Medusa can return a real boolean or a string. */
const metaBool = (
  metadata: HttpTypes.StoreProduct["metadata"],
  key: string
): boolean => {
  const value = (metadata ?? {})[key as keyof typeof metadata]
  return value === true || value === "true"
}

const metaStr = (
  metadata: HttpTypes.StoreProduct["metadata"],
  key: string
): string => {
  const value = (metadata ?? {})[key as keyof typeof metadata]
  return typeof value === "string" ? value : ""
}

/**
 * Scannable trust chips derived from product metadata. For prescription SKUs
 * this immediately answers "is this an Rx?", "who reviews it?", and "how is it
 * made?" without making the visitor read the compliance paragraphs.
 */
function assuranceChips(metadata: HttpTypes.StoreProduct["metadata"]) {
  const chips: { label: string; icon: React.ReactNode }[] = []
  const isRx = metaBool(metadata, "prescription_required")

  if (isRx) {
    chips.push({ label: "Prescription", icon: <RxIcon /> })
    chips.push({ label: "Physician-reviewed", icon: <StethIcon /> })
  }
  if (metaStr(metadata, "fda_status").includes("503A")) {
    chips.push({ label: "Compounded · 503A", icon: <FlaskIcon /> })
  }
  return chips
}

const ProductInfo = ({ product, reviewSummary, lead }: ProductInfoProps) => {
  const category = product.categories?.[0]
  const eyebrow = category?.name ?? product.collection?.title
  const eyebrowHref = category
    ? `/categories/${category.handle}`
    : product.collection
    ? `/collections/${product.collection.handle}`
    : undefined

  const chips = assuranceChips(product.metadata)

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

      {/* Assurance chips — quick scannable trust signals */}
      {chips.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {chips.map((chip) => (
            <li
              key={chip.label}
              className="inline-flex items-center gap-1.5 rounded-pill border border-line bg-sand-50 px-3 py-1.5 text-xs font-medium text-evergreen-800"
            >
              <span className="text-evergreen-600">{chip.icon}</span>
              {chip.label}
            </li>
          ))}
        </ul>
      )}

      {lead && (
        <p
          className="mt-1 text-base leading-relaxed text-ink-muted"
          data-testid="product-description"
        >
          {lead}
        </p>
      )}
    </div>
  )
}

/* --- tiny inline icons (16px, currentColor) --- */
const RxIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path
      d="M6 20V5h5a3.5 3.5 0 0 1 0 7H6m5 0 6 8m-3-4 4-4"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const StethIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path
      d="M6 3v5a5 5 0 0 0 10 0V3M4 3h3m6 0h3m-2 10v2a5 5 0 0 1-10 0"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="19" cy="14" r="2" stroke="currentColor" strokeWidth="1.8" />
  </svg>
)

const FlaskIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path
      d="M9 3h6M10 3v6l-5 8a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-8V3M7.5 14h9"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

export default ProductInfo
