import { Metadata } from "next"
import { notFound } from "next/navigation"
import { listProducts } from "@lib/data/products"
import { getRegion, listRegions } from "@lib/data/regions"
import { listProductReviews } from "@lib/data/reviews"
import { isAgeVerified, readAgeRequirement } from "@lib/util/age"
import ProductTemplate from "@modules/products/templates"
import ProductReviews from "@modules/products/components/product-reviews"
import AgeGate from "@modules/products/components/age-gate"
import TrackEvent from "@modules/analytics/track-event"
import { JsonLd } from "@lib/seo/ld-script"
import { productJsonLd, type ProductAvailability } from "@lib/seo/jsonld"
import { HttpTypes } from "@medusajs/types"

/**
 * Render PDPs dynamically (task 21c fix). The age gate reads the httpOnly
 * `age_verified` cookie server-side via `isAgeVerified()` → `cookies()`, which
 * is a dynamic API. Without this, static generation of these routes threw
 * DYNAMIC_SERVER_USAGE and the PDPs 500'd. `generateStaticParams` still enumerates
 * the handles; rendering just happens per-request so cookies() is allowed.
 * (Follow-up perf option: move the gate fully client-side to restore ISR.)
 */
export const dynamic = "force-dynamic"

type Props = {
  params: Promise<{ countryCode: string; handle: string }>
  searchParams: Promise<{ v_id?: string }>
}

export async function generateStaticParams() {
  try {
    const countryCodes = await listRegions().then((regions) =>
      regions?.map((r) => r.countries?.map((c) => c.iso_2)).flat()
    )

    if (!countryCodes) {
      return []
    }

    const promises = countryCodes.map(async (country) => {
      const { response } = await listProducts({
        countryCode: country,
        queryParams: { limit: 100, fields: "handle" },
      })

      return {
        country,
        products: response.products,
      }
    })

    const countryProducts = await Promise.all(promises)

    return countryProducts
      .flatMap((countryData) =>
        countryData.products.map((product) => ({
          countryCode: countryData.country,
          handle: product.handle,
        }))
      )
      .filter((param) => param.handle)
  } catch (error) {
    console.error(
      `Failed to generate static paths for product pages: ${
        error instanceof Error ? error.message : "Unknown error"
      }.`
    )
    return []
  }
}

function getImagesForVariant(
  product: HttpTypes.StoreProduct,
  selectedVariantId?: string
) {
  if (!selectedVariantId || !product.variants) {
    return product.images
  }

  const variant = product.variants!.find((v) => v.id === selectedVariantId)
  if (!variant || !variant.images?.length) {
    return product.images
  }

  const imageIdsMap = new Map(variant.images.map((i) => [i.id, true]))
  return product.images!.filter((i) => imageIdsMap.has(i.id))
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params
  const { handle } = params
  const region = await getRegion(params.countryCode)

  if (!region) {
    notFound()
  }

  const product = await listProducts({
    countryCode: params.countryCode,
    queryParams: { handle },
  }).then(({ response }) => response.products[0])

  if (!product) {
    notFound()
  }

  return {
    title: `${product.title} | Medusa Store`,
    description: `${product.title}`,
    openGraph: {
      title: `${product.title} | Medusa Store`,
      description: `${product.title}`,
      images: product.thumbnail ? [product.thumbnail] : [],
    },
  }
}

export default async function ProductPage(props: Props) {
  const params = await props.params
  const region = await getRegion(params.countryCode)
  const searchParams = await props.searchParams

  const selectedVariantId = searchParams.v_id

  if (!region) {
    notFound()
  }

  const pricedProduct = await listProducts({
    countryCode: params.countryCode,
    queryParams: { handle: params.handle },
  }).then(({ response }) => response.products[0])

  const images = getImagesForVariant(pricedProduct, selectedVariantId) ?? []

  if (!pricedProduct) {
    notFound()
  }

  // Approved reviews (task 21b) — feed the aggregate rating + Review nodes into
  // the product structured data. Fetch is cached (60s ISR); ProductReviews below
  // hits the same cached entry.
  const reviewData = await listProductReviews(pricedProduct.id, { limit: 5 })

  const productLd = buildProductJsonLd(
    pricedProduct,
    params.countryCode,
    reviewData
  )

  // Age gate (task 21c) — for SKUs flagged `requires_age_verification`, block
  // the PDP behind a self-attestation confirm until the age_verified cookie set.
  const ageReq = readAgeRequirement(pricedProduct.metadata)
  const showAgeGate = ageReq.required && !(await isAgeVerified())

  return (
    <>
      {showAgeGate && <AgeGate minAge={ageReq.minAge} />}
      {productLd && <JsonLd data={productLd} />}
      {/* Funnel event (task 10) — product view, IDs + price only, PHI-safe. */}
      <TrackEvent
        event="product_viewed"
        payload={{
          product_id: pricedProduct.id,
          category: pricedProduct.categories?.[0]?.name ?? undefined,
          price:
            pricedProduct.variants?.[0]?.calculated_price?.calculated_amount ??
            undefined,
          currency_code:
            pricedProduct.variants?.[0]?.calculated_price?.currency_code ??
            undefined,
        }}
      />
      <ProductTemplate
        product={pricedProduct}
        region={region}
        countryCode={params.countryCode}
        images={images}
      />
      <ProductReviews productId={pricedProduct.id} />
    </>
  )
}

/** Build the Product JSON-LD (with AggregateRating + Review) or null if unpriced. */
function buildProductJsonLd(
  product: HttpTypes.StoreProduct,
  countryCode: string,
  reviewData: Awaited<ReturnType<typeof listProductReviews>>
) {
  const variant = product.variants?.[0]
  const price = variant?.calculated_price?.calculated_amount
  const currency = variant?.calculated_price?.currency_code
  if (typeof price !== "number" || !currency) {
    return null
  }

  const images =
    (product.images?.map((i) => i.url).filter(Boolean) as
      | string[]
      | undefined) ?? (product.thumbnail ? [product.thumbnail] : [])

  const rawStates = product.metadata?.shipping_states
  const shippingStates = Array.isArray(rawStates)
    ? (rawStates as string[])
    : typeof rawStates === "string"
    ? rawStates.split(",").map((s) => s.trim())
    : undefined

  const availability: ProductAvailability =
    (variant?.inventory_quantity ?? 1) > 0 ? "InStock" : "OutOfStock"

  return productJsonLd({
    name: product.title,
    description: product.description || product.title,
    image: images,
    price,
    currency: currency.toUpperCase(),
    sku: variant?.sku ?? undefined,
    availability,
    ratingValue: reviewData.summary.count
      ? reviewData.summary.average
      : undefined,
    reviewCount: reviewData.summary.count || undefined,
    reviews: reviewData.reviews.map((r) => ({
      author: r.display_name,
      rating: r.rating,
      title: r.title,
      body: r.content,
      datePublished: r.created_at,
    })),
    url: `/${countryCode}/products/${product.handle}`,
    shippingStates,
  })
}
