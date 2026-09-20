import crypto from "node:crypto"
import { MedusaContainer } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"

/**
 * Auth helpers for the HTTP integration suite (roadmap task 24).
 *
 * Medusa's `/admin/*` routes require an authenticated admin user, and the store
 * review POST requires an authenticated customer (see api/middlewares.ts). Rather
 * than drive the full login flow per test, we mint the actor directly through the
 * User/Customer/Auth modules and sign a bearer JWT with the same secret the app
 * uses to verify.
 *
 * The signing secret MUST match `projectConfig.http.jwtSecret` in
 * medusa-config.ts, which defaults to "supersecret" and is left unset in
 * .env.test — so tokens signed here validate against the in-process app. We sign
 * HS256 with node:crypto (Medusa verifies its symmetric jwtSecret as HS256),
 * which keeps the helper dependency-free.
 */
const JWT_SECRET = process.env.JWT_SECRET || "supersecret"

export type AuthHeaders = { headers: Record<string, string> }

function bearer(token: string): AuthHeaders {
  return { headers: { authorization: `Bearer ${token}` } }
}

/**
 * Create a publishable API key. Every `/store/*` route is guarded by Medusa's
 * publishable-key middleware (the storefront sends NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY),
 * so store requests in tests must carry one or they 400. Returns request configs:
 *  - `store`      → the pk header alone (public GETs)
 *  - `storeAs(t)` → pk header + a customer bearer token (authenticated POSTs)
 */
export async function createPublishableKey(
  container: MedusaContainer
): Promise<{
  token: string
  store: AuthHeaders
  storeAs: (customerToken: string) => AuthHeaders
}> {
  const apiKeyModule = container.resolve(Modules.API_KEY)
  const apiKey = await apiKeyModule.createApiKeys({
    title: "Integration test",
    type: "publishable",
    created_by: "integration-test",
  })
  const token = apiKey.token
  return {
    token,
    store: { headers: { "x-publishable-api-key": token } },
    storeAs: (customerToken: string) => ({
      headers: {
        "x-publishable-api-key": token,
        authorization: `Bearer ${customerToken}`,
      },
    }),
  }
}

/** Minimal HS256 JWT signer — avoids pulling in `jsonwebtoken` as a dep. */
function signJwt(payload: Record<string, unknown>): string {
  const header = { alg: "HS256", typ: "JWT" }
  const now = Math.floor(Date.now() / 1000)
  const body = { iat: now, exp: now + 60 * 60 * 24, ...payload }
  const data = `${b64url(JSON.stringify(header))}.${b64url(
    JSON.stringify(body)
  )}`
  const sig = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(data)
    .digest("base64url")
  return `${data}.${sig}`
}

function b64url(input: string): string {
  return Buffer.from(input).toString("base64url")
}

/**
 * Create an admin user + emailpass identity and return a signed admin token.
 * Pass the result's `headers` straight to `api.get/post(url, headers)`.
 */
export async function createAdminUser(
  container: MedusaContainer,
  email = "admin@saludlink.test",
  password = "supersecret"
): Promise<{ id: string; token: string; headers: AuthHeaders }> {
  const userModule = container.resolve(Modules.USER)
  const user = await userModule.createUsers({ email })

  const authModule = container.resolve(Modules.AUTH)
  const authIdentity = await authModule.createAuthIdentities({
    provider_identities: [
      {
        provider: "emailpass",
        entity_id: email,
        provider_metadata: { password },
      },
    ],
    app_metadata: { user_id: user.id },
  })

  const token = signJwt({
    actor_id: user.id,
    actor_type: "user",
    auth_identity_id: authIdentity.id,
  })

  return { id: user.id, token, headers: bearer(token) }
}

/**
 * Create a store customer + emailpass identity and return a signed customer
 * token — the bearer credential the store review POST middleware expects
 * (`authenticate("customer", ["session", "bearer"])`).
 */
export async function createStoreCustomer(
  container: MedusaContainer,
  email = "shopper@saludlink.test",
  password = "supersecret"
): Promise<{ id: string; token: string; headers: AuthHeaders }> {
  const customerModule = container.resolve(Modules.CUSTOMER)
  const customer = await customerModule.createCustomers({ email })

  const authModule = container.resolve(Modules.AUTH)
  const authIdentity = await authModule.createAuthIdentities({
    provider_identities: [
      {
        provider: "emailpass",
        entity_id: email,
        provider_metadata: { password },
      },
    ],
    app_metadata: { customer_id: customer.id },
  })

  const token = signJwt({
    actor_id: customer.id,
    actor_type: "customer",
    auth_identity_id: authIdentity.id,
  })

  return { id: customer.id, token, headers: bearer(token) }
}
