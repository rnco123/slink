import { updateProductsWorkflow } from "@medusajs/medusa/core-flows"
import { Modules } from "@medusajs/framework/utils"
import { ExecArgs } from "@medusajs/framework/types"

/**
 * Attach the generated Saludlink illustrations to the seeded products by handle.
 * Run: npx medusa exec ./src/scripts/attach-images.ts
 * Images are served from the storefront /public/products/<handle>.svg during local dev
 * (PRODUCT_IMAGE_BASE overrides this; use S3/CDN in production).
 */
/**
 * Real product photography (committed to storefront /public/products) for the
 * handles we have shot. First entry is the thumbnail; the rest fill the PDP
 * gallery. Handles NOT listed here fall back to the generated `<handle>.svg`
 * illustration. Files are resolved against PRODUCT_IMAGE_BASE.
 */
const REAL_PHOTOS: Record<string, string[]> = {
  "semaglutide-homekit": [
    "semaglutide-homekit.png",
    "semaglutide-homekit-2.png",
    "semaglutide-homekit-3.png",
  ],
  "nad-plus-injection-homekit": [
    "nad-plus-injection-homekit.png",
    "nad-plus-injection-homekit-2.png",
    "nad-plus-injection-homekit-3.png",
  ],
  "tirzepatide-injection-at-home": [
    "tirzepatide-injection-at-home.png",
    "tirzepatide-injection-at-home-2.png",
    "tirzepatide-injection-at-home-3.png",
  ],
}

export default async function attachImages({ container }: ExecArgs) {
  const productModule = container.resolve(Modules.PRODUCT)
  const base =
    process.env.PRODUCT_IMAGE_BASE || "http://localhost:8000/products"

  const products = await productModule.listProducts(
    {},
    { relations: ["images"], select: ["id", "handle", "thumbnail"] }
  )

  /**
   * Non-destructive by default: fill products that have NO artwork, and upgrade
   * products still on a repo-served placeholder (thumbnail under `base`, or a
   * `.svg`) to their newer artwork — but NEVER clobber real photography uploaded
   * through Admin to a CDN/S3 (a different host), so a deploy can't silently
   * revert a merchandiser's work. Set ATTACH_IMAGES_FORCE=1 to re-point every
   * product at the repo artwork regardless.
   */
  const force = process.env.ATTACH_IMAGES_FORCE === "1"

  const isRepoManaged = (thumb?: string | null) =>
    !thumb || thumb.startsWith(base) || thumb.endsWith(".svg")

  const updates = products.flatMap((p) => {
    if (!p.handle) return []

    // Real photos take precedence for handles we've shot.
    const real = REAL_PHOTOS[p.handle]
    if (real) {
      if (!force && !isRepoManaged(p.thumbnail)) return []
      return [
        {
          id: p.id,
          thumbnail: `${base}/${real[0]}`,
          images: real.map((f) => ({ url: `${base}/${f}` })),
        },
      ]
    }

    // Otherwise fall back to the generated SVG illustration, only when the
    // product has no artwork yet (or when forced).
    const hasArt = !!p.thumbnail || (p.images?.length ?? 0) > 0
    if (!force && hasArt) return []
    return [
      {
        id: p.id,
        thumbnail: `${base}/${p.handle}.svg`,
        images: [{ url: `${base}/${p.handle}.svg` }],
      },
    ]
  })

  if (!updates.length) {
    console.log(
      "✔ All products already have current artwork — nothing to attach"
    )
    return
  }

  await updateProductsWorkflow(container).run({ input: { products: updates } })

  console.log(
    `✔ Attached artwork to ${updates.length}/${
      products.length
    } products (base: ${base})${force ? " [FORCED]" : ""}`
  )
}
