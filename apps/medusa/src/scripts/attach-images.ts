import { updateProductsWorkflow } from "@medusajs/medusa/core-flows"
import { Modules } from "@medusajs/framework/utils"
import { ExecArgs } from "@medusajs/framework/types"

/**
 * Attach the generated Saludlink illustrations to the seeded products by handle.
 * Run: npx medusa exec ./src/scripts/attach-images.ts
 * Images are served from the storefront /public/products/<handle>.svg during local dev
 * (PRODUCT_IMAGE_BASE overrides this; use S3/CDN in production).
 */
export default async function attachImages({ container }: ExecArgs) {
  const productModule = container.resolve(Modules.PRODUCT)
  const base =
    process.env.PRODUCT_IMAGE_BASE || "http://localhost:8000/products"

  const products = await productModule.listProducts(
    {},
    { relations: ["images"], select: ["id", "handle", "thumbnail"] }
  )

  /**
   * Non-destructive by default: only fill products that have NO artwork yet.
   *
   * This runs on every deploy, so it must never clobber real product photography
   * uploaded through Admin — otherwise a deploy would silently revert a
   * merchandiser's work back to the placeholder illustrations. Set
   * ATTACH_IMAGES_FORCE=1 to re-point every product at the repo illustrations.
   */
  const force = process.env.ATTACH_IMAGES_FORCE === "1"

  const candidates = products.filter((p) => {
    if (!p.handle) return false
    if (force) return true
    return !p.thumbnail && !(p.images && p.images.length > 0)
  })

  if (!candidates.length) {
    console.log("✔ All products already have artwork — nothing to attach")
    return
  }

  const updates = candidates.map((p) => ({
    id: p.id,
    thumbnail: `${base}/${p.handle}.svg`,
    images: [{ url: `${base}/${p.handle}.svg` }],
  }))

  await updateProductsWorkflow(container).run({ input: { products: updates } })

  console.log(
    `✔ Attached illustrations to ${updates.length}/${
      products.length
    } products (base: ${base})${force ? " [FORCED]" : ""}`
  )
}
