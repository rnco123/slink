import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { updateRegionsWorkflow } from "@medusajs/medusa/core-flows"

/**
 * Enable Stripe on existing regions (task 20).
 * -------------------------------------------------------------------------
 * The catalog seed (seed.ts) creates the US region with `pp_system_default`
 * so it runs BEFORE Stripe is keyed. Once STRIPE_API_KEY is set and the
 * backend has registered `@medusajs/payment-stripe` (provider id
 * `pp_stripe_stripe`), run this to add that provider to every region's
 * `payment_providers` so the storefront checkout offers a card payment.
 *
 * Idempotent: skips a region that already lists the Stripe provider.
 *
 *   medusa exec ./src/scripts/enable-stripe-region.ts
 *   # or: pnpm --filter @saludlink/medusa seed:stripe-region
 * -------------------------------------------------------------------------
 */

const STRIPE_PROVIDER_ID = "pp_stripe_stripe"

export default async function enableStripeRegion({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  if (!process.env.STRIPE_API_KEY) {
    logger.warn(
      "STRIPE_API_KEY is not set — the Stripe provider is not registered, so there is nothing to link. Set the key and restart the backend first."
    )
    return
  }

  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data: regions } = await query.graph({
    entity: "region",
    fields: ["id", "name", "payment_providers.id"],
  })

  if (!regions.length) {
    logger.error("No regions found — run the catalog seed (seed.ts) first.")
    return
  }

  let linked = 0
  for (const region of regions) {
    const current = (region.payment_providers ?? [])
      .map((p) => p?.id)
      .filter((id): id is string => Boolean(id))

    if (current.includes(STRIPE_PROVIDER_ID)) {
      logger.info(
        `Region "${region.name}" already has ${STRIPE_PROVIDER_ID} — skipping.`
      )
      continue
    }

    const next = Array.from(new Set([...current, STRIPE_PROVIDER_ID]))
    await updateRegionsWorkflow(container).run({
      input: {
        selector: { id: region.id },
        update: { payment_providers: next },
      },
    })
    linked++
    logger.info(
      `Linked ${STRIPE_PROVIDER_ID} to region "${
        region.name
      }" (providers: ${next.join(", ")}).`
    )
  }

  logger.info(
    `Stripe region linking complete — ${linked} region(s) updated, ${
      regions.length - linked
    } already linked.`
  )
}
