import { Modules } from "@medusajs/framework/utils"
import { ExecArgs } from "@medusajs/framework/types"

/**
 * Seed a sample promotion (roadmap task 21 — deals/promotions).
 * Run: npx medusa exec ./src/scripts/seed-promotions.ts
 *
 * Medusa v2 ships the Promotion module + admin Promotions UI built-in, and the
 * storefront checkout already has a discount-code component
 * (modules/checkout/components/discount-code). This just seeds a demonstrable
 * code so the admin has data and the storefront can apply a real discount.
 * Idempotent — skips if the code already exists.
 */
const CODE = "WELCOME10"

export default async function seedPromotions({ container }: ExecArgs) {
  const promotionModule = container.resolve(Modules.PROMOTION)

  const existing = await promotionModule.listPromotions({ code: CODE })
  if (existing.length) {
    console.log(`Promotion "${CODE}" already exists — skipping.`)
    return
  }

  await promotionModule.createPromotions([
    {
      code: CODE,
      is_automatic: false,
      type: "standard",
      status: "active",
      application_method: {
        type: "percentage",
        target_type: "order",
        allocation: "across",
        value: 10,
        currency_code: "usd",
      },
    },
  ])

  console.log(`✔ Seeded promotion "${CODE}" — 10% off order (USD).`)
}
