import { defineMiddlewares, authenticate } from "@medusajs/framework/http"

/**
 * Global API middleware registrations (roadmap task 21b).
 *
 * Submitting a product review requires an authenticated customer, so we attach
 * the customer auth middleware to the POST route. It populates `req.auth_context`
 * (used to attribute the review + run the verified-purchase check) and rejects
 * anonymous requests before they reach the handler. The GET on the same path
 * stays PUBLIC (approved reviews are public content).
 */
export default defineMiddlewares({
  routes: [
    {
      matcher: "/store/products/:id/reviews",
      method: "POST",
      middlewares: [authenticate("customer", ["session", "bearer"])],
    },
  ],
})
