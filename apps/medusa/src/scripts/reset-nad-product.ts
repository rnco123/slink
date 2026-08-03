import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { deleteProductsWorkflow } from "@medusajs/medusa/core-flows"

/**
 * One-off: hard-delete the NAD+ product so `migrate-catalog-rx.ts` re-creates it
 * from the updated `data/rx-products.ts` definition (new 500mg/1000mg strength
 * variants). Medusa can't cleanly swap a product's options in place, so the
 * delete + re-create path is the reliable way to change its variant structure.
 *
 * Order line items are point-in-time snapshots, so this doesn't corrupt order
 * history. After running: `migrate-catalog-rx.ts` then `attach-images.ts`.
 *
 * Run: npx medusa exec ./src/scripts/reset-nad-product.ts
 */
export default async function resetNadProduct({ container }: ExecArgs) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "product",
    fields: ["id", "handle"],
    filters: { handle: ["nad-plus-injection-homekit"] },
  })

  if (!data.length) {
    console.log("No NAD+ product found — nothing to delete.")
    return
  }

  await deleteProductsWorkflow(container).run({
    input: { ids: data.map((p) => p.id) },
  })
  console.log(
    `✔ Deleted NAD+ product (${data.length}). Now run migrate-catalog-rx + attach-images.`
  )
}
