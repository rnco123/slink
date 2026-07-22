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
    { select: ["id", "handle"] }
  )

  const updates = products
    .filter((p) => p.handle)
    .map((p) => ({
      id: p.id,
      thumbnail: `${base}/${p.handle}.svg`,
      images: [{ url: `${base}/${p.handle}.svg` }],
    }))

  await updateProductsWorkflow(container).run({ input: { products: updates } })

  console.log(`✔ Attached illustrations to ${updates.length} products`)
}
