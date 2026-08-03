import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import {
  createInventoryLevelsWorkflow,
  createProductsWorkflow,
  deleteProductCategoriesWorkflow,
  deleteProductsWorkflow,
} from "@medusajs/medusa/core-flows"
import { buildRxProducts } from "./data/rx-products"

/**
 * One-off catalog migration: swaps the launch OTC catalog (the original 9
 * products + 7 categories) for the compounded-Rx catalog (see
 * `data/rx-products.ts`). Unlike `seed.ts`, this is safe to run against an
 * ALREADY-SEEDED database (local dev or prod) — it does not touch
 * regions/shipping/stock-locations/sales-channels, and every step is
 * idempotent, so it can be re-run safely if interrupted.
 *
 * Old products are HARD-DELETED (per user request — "remove all other
 * products"), not just unpublished. Medusa keeps order line items as
 * point-in-time snapshots, so this doesn't corrupt any existing order
 * history; it just removes the product/variant/inventory-item records.
 *
 * Run: npx medusa exec ./src/scripts/migrate-catalog-rx.ts
 */

const OLD_CATEGORY_NAMES = [
  "Weight Management",
  "Metabolic Support",
  "Nutrition & Meal Support",
  "Monitoring Devices",
  "Vitamins & Supplements",
  "Body Composition",
  "Ketone & Glucose",
]

const OLD_PRODUCT_HANDLES = [
  "digital-body-composition-scale",
  "blood-ketone-monitoring-kit",
  "metabolic-multivitamin-30-day",
  "metabolic-support-berberine-capsules",
  "fiber-prebiotic-daily-blend",
  "bariatric-protein-shake-vanilla",
  "electrolyte-hydration-sticks",
  "appetite-support-konjac-fiber-gummies",
  "portion-control-meal-prep-container-set",
]

const NEW_PRODUCT_HANDLES = [
  "tirzepatide-injection-at-home",
  "semaglutide-homekit",
  "nad-plus-injection-homekit",
]

export default async function migrateCatalogRx({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const salesChannelModuleService = container.resolve(Modules.SALES_CHANNEL)
  const stockLocationModuleService = container.resolve(Modules.STOCK_LOCATION)
  const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT)

  // 1. Delete the old OTC products.
  const { data: oldProducts } = await query.graph({
    entity: "product",
    fields: ["id", "handle"],
    filters: { handle: OLD_PRODUCT_HANDLES },
  })
  if (oldProducts.length) {
    await deleteProductsWorkflow(container).run({
      input: { ids: oldProducts.map((p) => p.id) },
    })
    logger.info(`Deleted ${oldProducts.length} old OTC product(s).`)
  } else {
    logger.info("Old OTC products already deleted or absent — skipping.")
  }

  // 2. Delete the old category tree — children before parents, or Medusa
  // rejects deleting a parent that still has children.
  const { data: oldCategories } = await query.graph({
    entity: "product_category",
    fields: ["id", "name", "parent_category_id"],
    filters: { name: OLD_CATEGORY_NAMES },
  })
  if (oldCategories.length) {
    const children = oldCategories.filter((c) => c.parent_category_id)
    const parents = oldCategories.filter((c) => !c.parent_category_id)
    if (children.length) {
      await deleteProductCategoriesWorkflow(container).run({
        input: children.map((c) => c.id),
      })
    }
    if (parents.length) {
      await deleteProductCategoriesWorkflow(container).run({
        input: parents.map((c) => c.id),
      })
    }
    logger.info(
      `Deleted ${oldCategories.length} old categor${
        oldCategories.length === 1 ? "y" : "ies"
      }.`
    )
  } else {
    logger.info("Old categories already deleted or absent — skipping.")
  }

  // 3. Create the 3 new Rx products (skip any that already exist).
  const { data: existingNew } = await query.graph({
    entity: "product",
    fields: ["id", "handle"],
    filters: { handle: NEW_PRODUCT_HANDLES },
  })
  const existingHandles = new Set(existingNew.map((p) => p.handle))
  const missingHandles = NEW_PRODUCT_HANDLES.filter(
    (h) => !existingHandles.has(h)
  )

  if (!missingHandles.length) {
    logger.info("All 3 Rx products already exist — nothing to create.")
    logger.info("Catalog migration complete.")
    return
  }

  // Reuse the store's existing infra (created by seed.ts) rather than
  // re-creating it — this script must be safe on an already-seeded DB.
  const [defaultSalesChannel] =
    await salesChannelModuleService.listSalesChannels({
      name: "Default Sales Channel",
    })
  const [stockLocation] = await stockLocationModuleService.listStockLocations(
    {}
  )
  const shippingProfiles = await fulfillmentModuleService.listShippingProfiles({
    type: "default",
  })
  const shippingProfile = shippingProfiles[0]

  if (!defaultSalesChannel || !stockLocation || !shippingProfile) {
    logger.error(
      "Missing sales channel / stock location / shipping profile — this DB hasn't been through seed.ts yet. Run the full seed on a fresh DB instead of this migration."
    )
    return
  }

  const allNewProducts = buildRxProducts({
    shippingProfileId: shippingProfile.id,
    salesChannelId: defaultSalesChannel.id,
  })
  const productsToCreate = allNewProducts.filter((p) =>
    missingHandles.includes(p.handle)
  )

  const { result: created } = await createProductsWorkflow(container).run({
    input: { products: productsToCreate },
  })
  logger.info(
    `Created ${created.length} new Rx product(s): ${created
      .map((p) => p.handle)
      .join(", ")}.`
  )

  // 4. Inventory levels for the newly created variants only (old products'
  // levels are untouched).
  const newSkus = created.flatMap((p) =>
    (p.variants ?? []).map((v) => v.sku).filter(Boolean)
  )
  const { data: newVariants } = await query.graph({
    entity: "product_variant",
    fields: ["id", "sku", "inventory.id"],
    filters: { sku: newSkus as string[] },
  })
  const inventoryLevels = newVariants.flatMap((v) =>
    (v.inventory ?? [])
      .filter((item): item is NonNullable<typeof item> => item != null)
      .map((item) => ({
        location_id: stockLocation.id,
        stocked_quantity: 1_000_000,
        inventory_item_id: item.id,
      }))
  )
  if (inventoryLevels.length) {
    await createInventoryLevelsWorkflow(container).run({
      input: { inventory_levels: inventoryLevels },
    })
    logger.info(`Created ${inventoryLevels.length} inventory level(s).`)
  }

  logger.info("Catalog migration complete.")
}
