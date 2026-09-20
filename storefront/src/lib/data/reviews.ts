"use server"

import { sdk } from "@lib/config"
import { getAuthHeaders } from "./cookies"

/**
 * Product reviews data layer (roadmap task 21b).
 * Talks to the custom Medusa store API:
 *   GET  /store/products/:id/reviews  (public, approved only)
 *   POST /store/products/:id/reviews  (authenticated customer)
 */

export type ProductReview = {
  id: string
  display_name: string
  rating: number
  title: string | null
  content: string
  verified_purchase: boolean
  created_at?: string
}

export type ReviewSummary = { count: number; average: number }

export type ReviewListResponse = {
  reviews: ProductReview[]
  count: number
  limit: number
  offset: number
  summary: ReviewSummary
}

/** Public list of approved reviews + aggregate summary for a product. */
export const listProductReviews = async (
  productId: string,
  { limit = 10, offset = 0 }: { limit?: number; offset?: number } = {}
): Promise<ReviewListResponse> => {
  try {
    return await sdk.client.fetch<ReviewListResponse>(
      `/store/products/${productId}/reviews`,
      {
        method: "GET",
        query: { limit, offset },
        // ISR: newly-approved reviews surface within a minute without a webhook.
        next: { revalidate: 60, tags: [`reviews-${productId}`] },
        cache: "force-cache",
      }
    )
  } catch {
    // Never let a reviews outage break the PDP.
    return {
      reviews: [],
      count: 0,
      limit,
      offset,
      summary: { count: 0, average: 0 },
    }
  }
}

export type SubmitReviewInput = {
  rating: number
  title?: string
  content: string
  display_name?: string
}

export type SubmitReviewResult =
  | { ok: true; message: string }
  | { ok: false; status: number; message: string }

/**
 * Submit a review. Requires a signed-in customer (the `_medusa_jwt` cookie);
 * returns a 401 result the form turns into a "sign in to review" prompt.
 */
export const submitReview = async (
  productId: string,
  input: SubmitReviewInput
): Promise<SubmitReviewResult> => {
  const authHeaders = await getAuthHeaders()
  if (!("authorization" in authHeaders)) {
    return {
      ok: false,
      status: 401,
      message: "Please sign in to write a review.",
    }
  }

  try {
    const data = await sdk.client.fetch<{ message?: string }>(
      `/store/products/${productId}/reviews`,
      {
        method: "POST",
        headers: authHeaders,
        body: {
          rating: input.rating,
          title: input.title,
          content: input.content,
          display_name: input.display_name,
        },
      }
    )
    return {
      ok: true,
      message:
        data?.message ??
        "Thank you — your review will appear once it has been approved.",
    }
  } catch (e: any) {
    const status = e?.status ?? e?.response?.status ?? 400
    const message =
      e?.message ??
      e?.response?.data?.message ??
      "Something went wrong submitting your review."
    return { ok: false, status, message }
  }
}
