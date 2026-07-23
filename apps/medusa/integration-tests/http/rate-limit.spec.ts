import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { createStoreCustomer, createPublishableKey } from "../helpers/auth"

jest.setTimeout(5 * 60 * 1000)

/**
 * Rate limiter — security regression suite (roadmap task 87, covers task 50).
 *
 * The review-submission endpoint is guarded by a per-IP fixed-window limiter
 * (api/rate-limit.ts + middlewares.ts): 5 requests / 60s / client-IP, applied
 * BEFORE the auth stack so an anonymous flood is rejected cheaply. This suite
 * hammers `POST /store/products/:id/reviews` past the limit and asserts:
 *   - the 6th request is 429 with RateLimit-* + Retry-After headers,
 *   - the limiter keys on the TRUSTED rightmost X-Forwarded-For hop, so rotating
 *     the attacker-controlled leftmost value does NOT evade the limit (the task-50
 *     hardening — the regression this test exists to catch),
 *   - a genuinely different client (different rightmost hop) has its own budget,
 *   - the budget resets on a fresh window.
 *
 * Each test uses a distinct simulated client IP so the per-IP buckets don't
 * collide across tests within the same 60s wall-clock window.
 */
medusaIntegrationTestRunner({
  inApp: true,
  env: {},
  testSuite: ({ api, getContainer }) => {
    const PRODUCT_ID = "prod_ratelimit_test"
    // Mirrors RATE_LIMIT_REVIEW_MAX's default in middlewares.ts.
    const LIMIT = 5

    let customer: Awaited<ReturnType<typeof createStoreCustomer>>
    let pk: Awaited<ReturnType<typeof createPublishableKey>>

    beforeEach(async () => {
      const container = getContainer()
      customer = await createStoreCustomer(container)
      pk = await createPublishableKey(container)
    })

    const VALID_BODY = {
      rating: 5,
      content: "Solid product — works exactly as described and shipped fast.",
    }

    // Submit a review as our customer from a simulated client. `xff` sets
    // X-Forwarded-For; its rightmost hop is what a single trusted proxy (Caddy)
    // would append, i.e. the value the limiter must key on. Always resolves to a
    // response object (200/201/400/429) so callers can assert on status/headers.
    const postReview = (xff?: string, body: Record<string, unknown> = VALID_BODY) => {
      const headers: Record<string, string> = {
        ...pk.storeAs(customer.token).headers,
      }
      if (xff) {
        headers["x-forwarded-for"] = xff
      }
      return api
        .post(`/store/products/${PRODUCT_ID}/reviews`, body, { headers })
        .catch((e: { response: unknown }) => e.response)
    }

    it("blocks submissions past the limit with RateLimit-* / Retry-After headers", async () => {
      const xff = "deadbeef, 198.51.100.10" // leftmost = noise, rightmost = trusted peer

      // The first LIMIT requests are allowed and advertise the budget.
      for (let i = 0; i < LIMIT; i++) {
        const r = await postReview(xff)
        expect(r.status).not.toEqual(429)
        expect(r.headers["ratelimit-limit"]).toEqual(String(LIMIT))
        expect(r.headers["ratelimit-remaining"]).toEqual(String(LIMIT - i - 1))
      }

      // The next one is rejected.
      const blocked = await postReview(xff)
      expect(blocked.status).toEqual(429)
      expect(blocked.data).toMatchObject({ type: "too_many_requests" })
      expect(blocked.headers["ratelimit-limit"]).toEqual(String(LIMIT))
      expect(blocked.headers["ratelimit-remaining"]).toEqual("0")

      // Retry-After + RateLimit-Reset tell the client when to try again.
      const retryAfter = Number(blocked.headers["retry-after"])
      expect(Number.isInteger(retryAfter)).toBe(true)
      expect(retryAfter).toBeGreaterThan(0)
      expect(retryAfter).toBeLessThanOrEqual(60)
      expect(Number(blocked.headers["ratelimit-reset"])).toBeGreaterThan(0)
    })

    it("keys on the trusted rightmost XFF hop — spoofing the leftmost cannot evade it (task-50 hardening)", async () => {
      const trustedPeer = "203.0.113.7"

      // Every request rotates the attacker-controlled leftmost value but keeps the
      // same trusted rightmost hop. If the limiter keyed on the leftmost (the bug
      // the hardening fixed), each of these would look like a new client and all
      // would pass. Keying on the rightmost means they share one budget.
      for (let i = 0; i < LIMIT; i++) {
        const r = await postReview(`10.0.0.${i}, ${trustedPeer}`)
        expect(r.status).not.toEqual(429)
      }
      const blocked = await postReview(`10.0.0.250, ${trustedPeer}`)
      expect(blocked.status).toEqual(429)

      // A genuinely different client (different rightmost hop) is NOT collateral
      // damage — it has its own budget.
      const otherClient = await postReview("10.0.0.1, 203.0.113.99")
      expect(otherClient.status).not.toEqual(429)
    })

    it("resets the budget on a fresh window", async () => {
      const xff = "abc, 192.0.2.55"

      for (let i = 0; i < LIMIT; i++) {
        await postReview(xff)
      }
      const blocked = await postReview(xff)
      expect(blocked.status).toEqual(429)

      // Wait out the current fixed window (advertised by RateLimit-Reset), then the
      // same client is allowed again — the window key rolled over.
      const resetSeconds = Number(blocked.headers["ratelimit-reset"]) || 60
      await new Promise((resolve) =>
        setTimeout(resolve, (resetSeconds + 1) * 1000)
      )

      const afterReset = await postReview(xff)
      expect(afterReset.status).not.toEqual(429)
      expect(afterReset.headers["ratelimit-remaining"]).toEqual(
        String(LIMIT - 1)
      )
    })
  },
})
