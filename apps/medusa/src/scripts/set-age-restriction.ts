import { Modules } from "@medusajs/framework/utils"
import { ExecArgs } from "@medusajs/framework/types"

/**
 * Flag one product as age-restricted (roadmap task 21c) so the storefront age
 * gate has a real target for demo + e2e. Idempotent.
 * Run: npx medusa exec ./src/scripts/set-age-restriction.ts
 *
 * The storefront reads `requires_age_verification` (+ optional `min_age`) from
 * product metadata and blocks the PDP behind a self-attestation confirm.
 */
const TARGET_HANDLE = "metabolic-support-berberine-capsules"
const MIN_AGE = 18

export default async function setAgeRestriction({ container }: ExecArgs) {
  const productModule = container.resolve(Modules.PRODUCT)

  const [product] = await productModule.listProducts(
    { handle: TARGET_HANDLE },
    { select: ["id", "handle", "metadata"] }
  )
  if (!product) {
    console.log(
      `Product "${TARGET_HANDLE}" not found — run the catalog seed first.`
    )
    return
  }

  const metadata = { ...(product.metadata ?? {}) }
  if (
    metadata.requires_age_verification === true &&
    Number(metadata.min_age) === MIN_AGE
  ) {
    console.log(`"${TARGET_HANDLE}" is already age-restricted — skipping.`)
    return
  }

  await productModule.updateProducts(product.id, {
    metadata: {
      ...metadata,
      requires_age_verification: true,
      min_age: MIN_AGE,
    },
  })

  console.log(
    `✔ Flagged "${TARGET_HANDLE}" as age-restricted (min_age=${MIN_AGE}).`
  )
}
