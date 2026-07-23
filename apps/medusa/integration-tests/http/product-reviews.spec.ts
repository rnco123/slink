import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import {
  createAdminUser,
  createStoreCustomer,
  createPublishableKey,
} from "../helpers/auth"

jest.setTimeout(5 * 60 * 1000)

/**
 * Product reviews — moderation gate end-to-end (roadmap task 21b, tested in 24).
 *
 * The load-bearing compliance property: a customer-submitted review is NEVER
 * visible on the storefront until an admin approves it. An unmoderated
 * health-product review can make a disease/treatment claim that risks
 * LegitScript/FTC standing, so this suite proves the gate holds across the real
 * HTTP surface: submit (pending) → invisible → admin approves → visible.
 */
medusaIntegrationTestRunner({
  inApp: true,
  env: {},
  testSuite: ({ api, getContainer }) => {
    const PRODUCT_ID = "prod_test_reviews_1"

    let admin: Awaited<ReturnType<typeof createAdminUser>>
    let customer: Awaited<ReturnType<typeof createStoreCustomer>>
    let pk: Awaited<ReturnType<typeof createPublishableKey>>

    beforeEach(async () => {
      const container = getContainer()
      admin = await createAdminUser(container)
      customer = await createStoreCustomer(container)
      pk = await createPublishableKey(container)
    })

    // Store reviews list — public, but the publishable-key middleware still applies.
    const listReviews = () =>
      api.get(`/store/products/${PRODUCT_ID}/reviews`, pk.store)

    // Authenticated customer submit: publishable key + customer bearer token.
    const submitReview = (body: Record<string, unknown>) =>
      api.post(
        `/store/products/${PRODUCT_ID}/reviews`,
        body,
        pk.storeAs(customer.token)
      )

    describe("Submission + auth gate", () => {
      it("requires an authenticated customer (401 when anonymous)", async () => {
        // Valid publishable key but NO customer token → the auth middleware rejects.
        const res = await api
          .post(
            `/store/products/${PRODUCT_ID}/reviews`,
            {
              rating: 5,
              content: "Anonymous attempt, should be rejected by middleware.",
            },
            pk.store
          )
          .catch((e: { response: { status: number } }) => e.response)
        expect(res.status).toEqual(401)
      })

      it("accepts a valid review and lands it as pending (never approved)", async () => {
        const res = await submitReview({
          rating: 5,
          title: "Great",
          content: "Arrived quickly and works exactly as described. Happy.",
          display_name: "Alex",
        })
        expect(res.status).toEqual(201)
        expect(res.data.review.status).toEqual("pending")
        // Unverified purchase (this customer has no orders) — flagged accordingly.
        expect(res.data.review.verified_purchase).toBe(false)
      })

      it.each([
        { rating: 0, content: "long enough content here", why: "rating < 1" },
        { rating: 6, content: "long enough content here", why: "rating > 5" },
        {
          rating: 3.5,
          content: "long enough content here",
          why: "non-integer",
        },
        { rating: 4, content: "short", why: "content < 10 chars" },
      ])("rejects invalid input ($why)", async ({ rating, content }) => {
        const res = await submitReview({ rating, content }).catch(
          (e: { response: { status: number } }) => e.response
        )
        expect(res.status).toEqual(400)
      })
    })

    describe("Moderation gate (submit → invisible → approve → visible)", () => {
      it("hides pending reviews from the store and reveals them only after approval", async () => {
        // 1) Customer submits → pending.
        const submitted = await submitReview({
          rating: 4,
          title: "Solid",
          content: "Been using it for a month, no complaints at all so far.",
        })
        const reviewId: string = submitted.data.review.id
        expect(submitted.data.review.status).toEqual("pending")

        // 2) Store list shows NOTHING (approved-only) + empty summary.
        const before = await listReviews()
        expect(before.status).toEqual(200)
        expect(before.data.count).toEqual(0)
        expect(before.data.reviews).toHaveLength(0)
        expect(before.data.summary).toMatchObject({ count: 0, average: 0 })

        // 3) It IS in the admin pending queue.
        const queue = await api.get(
          "/admin/product-reviews?status=pending",
          admin.headers
        )
        expect(queue.data.reviews.map((r: { id: string }) => r.id)).toContain(
          reviewId
        )

        // 4) Admin approves.
        const moderated = await api.post(
          `/admin/product-reviews/${reviewId}`,
          { status: "approved" },
          admin.headers
        )
        expect(moderated.status).toEqual(200)
        expect(moderated.data.review.status).toEqual("approved")
        expect(moderated.data.review.moderated_by).toEqual(admin.id)

        // 5) Now the store shows it, and the aggregate reflects the rating.
        const after = await listReviews()
        expect(after.data.count).toEqual(1)
        expect(after.data.reviews[0]).toMatchObject({
          rating: 4,
          title: "Solid",
        })
        expect(after.data.summary).toMatchObject({ count: 1, average: 4 })
      })

      it("rejecting an approved review pulls it back off the storefront", async () => {
        const submitted = await submitReview({
          rating: 5,
          content: "Excellent — would buy again without a second thought.",
        })
        const reviewId: string = submitted.data.review.id

        await api.post(
          `/admin/product-reviews/${reviewId}`,
          { status: "approved" },
          admin.headers
        )
        expect((await listReviews()).data.count).toEqual(1)

        await api.post(
          `/admin/product-reviews/${reviewId}`,
          { status: "rejected" },
          admin.headers
        )
        expect((await listReviews()).data.count).toEqual(0)
      })

      it("re-submitting an approved review resets it to pending (one per customer/product)", async () => {
        const first = await submitReview({
          rating: 5,
          content: "First take: genuinely impressed with the quality.",
        })
        const reviewId: string = first.data.review.id
        await api.post(
          `/admin/product-reviews/${reviewId}`,
          { status: "approved" },
          admin.headers
        )

        // Same customer submits again → updates the existing row, back to pending.
        const second = await submitReview({
          rating: 2,
          content: "Changed my mind after longer use — downgrading this.",
        })
        expect(second.data.review.id).toEqual(reviewId)
        expect(second.data.review.status).toEqual("pending")

        // Edited review is hidden again until re-moderated (no duplicate row).
        const store = await listReviews()
        expect(store.data.count).toEqual(0)
        const all = await api.get(
          "/admin/product-reviews?status=all",
          admin.headers
        )
        expect(
          all.data.reviews.filter(
            (r: { product_id: string }) => r.product_id === PRODUCT_ID
          )
        ).toHaveLength(1)
      })
    })

    describe("Admin moderation guards", () => {
      it("rejects an invalid moderation status (400)", async () => {
        const submitted = await submitReview({
          rating: 3,
          content: "An average product, nothing special to report here.",
        })
        const reviewId: string = submitted.data.review.id
        const res = await api
          .post(
            `/admin/product-reviews/${reviewId}`,
            { status: "banished" },
            admin.headers
          )
          .catch((e: { response: { status: number } }) => e.response)
        expect(res.status).toEqual(400)
      })

      it("requires admin auth for the moderation queue (401)", async () => {
        const res = await api
          .get("/admin/product-reviews")
          .catch((e: { response: { status: number } }) => e.response)
        expect(res.status).toEqual(401)
      })

      it("hard-deletes a review", async () => {
        const submitted = await submitReview({
          rating: 1,
          content: "Spam-like content that a moderator would remove outright.",
        })
        const reviewId: string = submitted.data.review.id

        const del = await api.delete(
          `/admin/product-reviews/${reviewId}`,
          admin.headers
        )
        expect(del.status).toEqual(200)
        expect(del.data).toMatchObject({ id: reviewId, deleted: true })

        const all = await api.get(
          "/admin/product-reviews?status=all",
          admin.headers
        )
        expect(all.data.reviews.map((r: { id: string }) => r.id)).not.toContain(
          reviewId
        )
      })
    })
  },
})
