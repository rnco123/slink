import { defineMiddlewares, authenticate } from "@medusajs/framework/http"
import { limitFromEnv, rateLimit } from "./rate-limit"

/**
 * Global API middleware registrations.
 *
 * Two concerns are wired here:
 *
 * 1. Rate limiting (roadmap task 50) — Redis-backed per-IP limits on the abuse-
 *    prone surfaces: authentication (login / registration / admin auth all flow
 *    through `/auth/*`), checkout completion, and review submission. See
 *    ./rate-limit.ts for the algorithm + fail-open behaviour. Limits are env-
 *    tunable in prod; the defaults below are the launch values.
 *
 * 2. Review-submission auth (roadmap task 21b) — the store review POST requires
 *    an authenticated customer. `authenticate` populates `req.auth_context`
 *    (used to attribute the review + run the verified-purchase check) and
 *    rejects anonymous requests. The GET on the same path stays PUBLIC.
 *
 * Middleware ordering note: the rate-limit entry for the review POST is defined
 * BEFORE the auth entry so an anonymous flood is rejected cheaply (by IP)
 * before hitting the auth stack.
 *
 * Contact form: the storefront "contact" page is a static mailto page with no
 * submission endpoint, so there is no server surface to rate-limit here. If a
 * contact/newsletter POST is added later, wrap it with `rateLimit()` the same
 * way. See docs/SECURITY-CORS-COOKIES.md.
 */
export default defineMiddlewares({
  routes: [
    // --- Rate limits ---------------------------------------------------------
    {
      // All auth flows: emailpass login, customer registration, admin auth,
      // token refresh. 10 requests / minute / IP by default.
      matcher: "/auth/*",
      middlewares: [
        rateLimit({
          id: "auth",
          limit: limitFromEnv("RATE_LIMIT_AUTH_MAX", 10),
          windowSeconds: 60,
        }),
      ],
    },
    {
      // Checkout completion (payment capture / order placement). Kept a little
      // higher than auth to tolerate legit retries. 15 / minute / IP.
      matcher: "/store/carts/:id/complete",
      method: "POST",
      middlewares: [
        rateLimit({
          id: "checkout",
          limit: limitFromEnv("RATE_LIMIT_CHECKOUT_MAX", 15),
          windowSeconds: 60,
        }),
      ],
    },
    {
      // Review submission — cheap per-IP guard in front of the auth stack.
      // 5 / minute / IP.
      matcher: "/store/products/:id/reviews",
      method: "POST",
      middlewares: [
        rateLimit({
          id: "review",
          limit: limitFromEnv("RATE_LIMIT_REVIEW_MAX", 5),
          windowSeconds: 60,
        }),
      ],
    },

    // --- Auth (task 21b) -----------------------------------------------------
    {
      matcher: "/store/products/:id/reviews",
      method: "POST",
      middlewares: [authenticate("customer", ["session", "bearer"])],
    },
  ],
})
