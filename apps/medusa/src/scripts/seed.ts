import { CreateInventoryLevelInput, ExecArgs } from "@medusajs/framework/types";
import {
  ContainerRegistrationKeys,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils";
import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";
import {
  createApiKeysWorkflow,
  createInventoryLevelsWorkflow,
  createProductCategoriesWorkflow,
  createProductsWorkflow,
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  createShippingOptionsWorkflow,
  createShippingProfilesWorkflow,
  createStockLocationsWorkflow,
  createTaxRegionsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
  updateStoresStep,
  updateStoresWorkflow,
} from "@medusajs/medusa/core-flows";
import { ApiKey } from "../../.medusa/types/query-entry-points";

/**
 * Saludlink seed — Weight & Metabolic Health catalog (T18)
 * -------------------------------------------------------------------------
 * US-only region, USD pricing, US shipping options.
 *
 * COMPLIANCE (LegitScript / FDA-FTC — see docs/legitweb-rules.md):
 *   - v1 catalog is OTC / devices / wellness ONLY. NO prescription (Rx) items.
 *   - Product copy is structure/function style only ("supports", "helps
 *     maintain"). NO disease treatment/cure claims.
 *   - Every product carries compliance metadata: fda_status, usage_warnings,
 *     active_ingredients (where relevant), requires_age_verification,
 *     shipping_states (default "all" — tighten per product when a state
 *     restriction applies).
 * -------------------------------------------------------------------------
 */

const updateStoreCurrencies = createWorkflow(
  "update-store-currencies",
  (input: {
    supported_currencies: { currency_code: string; is_default?: boolean }[];
    store_id: string;
  }) => {
    const normalizedInput = transform({ input }, (data) => {
      return {
        selector: { id: data.input.store_id },
        update: {
          supported_currencies: data.input.supported_currencies.map(
            (currency) => {
              return {
                currency_code: currency.currency_code,
                is_default: currency.is_default ?? false,
              };
            }
          ),
        },
      };
    });

    const stores = updateStoresStep(normalizedInput);

    return new WorkflowResponse(stores);
  }
);

export default async function seedDemoData({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const link = container.resolve(ContainerRegistrationKeys.LINK);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT);
  const salesChannelModuleService = container.resolve(Modules.SALES_CHANNEL);
  const storeModuleService = container.resolve(Modules.STORE);

  // US-only launch market (LegitScript: services/shipping limited to licensed
  // jurisdictions — start with the full US, tighten per-product as needed).
  const countries = ["us"];

  logger.info("Seeding store data...");
  const [store] = await storeModuleService.listStores();
  let defaultSalesChannel = await salesChannelModuleService.listSalesChannels({
    name: "Default Sales Channel",
  });

  if (!defaultSalesChannel.length) {
    // create the default sales channel
    const { result: salesChannelResult } = await createSalesChannelsWorkflow(
      container
    ).run({
      input: {
        salesChannelsData: [
          {
            name: "Default Sales Channel",
          },
        ],
      },
    });
    defaultSalesChannel = salesChannelResult;
  }

  await updateStoreCurrencies(container).run({
    input: {
      store_id: store.id,
      supported_currencies: [
        {
          currency_code: "usd",
          is_default: true,
        },
      ],
    },
  });

  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: store.id },
      update: {
        default_sales_channel_id: defaultSalesChannel[0].id,
      },
    },
  });

  logger.info("Seeding region data...");
  const { result: regionResult } = await createRegionsWorkflow(container).run({
    input: {
      regions: [
        {
          name: "United States",
          currency_code: "usd",
          countries,
          // pp_stripe_stripe once the Stripe provider is enabled via env;
          // pp_system_default keeps the seed runnable before Stripe is keyed.
          payment_providers: ["pp_system_default"],
        },
      ],
    },
  });
  const region = regionResult[0];
  logger.info("Finished seeding regions.");

  logger.info("Seeding tax regions...");
  await createTaxRegionsWorkflow(container).run({
    input: countries.map((country_code) => ({
      country_code,
      provider_id: "tp_system",
    })),
  });
  logger.info("Finished seeding tax regions.");

  logger.info("Seeding stock location data...");
  const { result: stockLocationResult } = await createStockLocationsWorkflow(
    container
  ).run({
    input: {
      locations: [
        {
          name: "US Fulfillment Center",
          address: {
            city: "Dallas",
            country_code: "US",
            address_1: "",
          },
        },
      ],
    },
  });
  const stockLocation = stockLocationResult[0];

  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: store.id },
      update: {
        default_location_id: stockLocation.id,
      },
    },
  });

  await link.create({
    [Modules.STOCK_LOCATION]: {
      stock_location_id: stockLocation.id,
    },
    [Modules.FULFILLMENT]: {
      fulfillment_provider_id: "manual_manual",
    },
  });

  logger.info("Seeding fulfillment data...");
  const shippingProfiles = await fulfillmentModuleService.listShippingProfiles({
    type: "default",
  });
  let shippingProfile = shippingProfiles.length ? shippingProfiles[0] : null;

  if (!shippingProfile) {
    const { result: shippingProfileResult } =
      await createShippingProfilesWorkflow(container).run({
        input: {
          data: [
            {
              name: "Default Shipping Profile",
              type: "default",
            },
          ],
        },
      });
    shippingProfile = shippingProfileResult[0];
  }

  const fulfillmentSet = await fulfillmentModuleService.createFulfillmentSets({
    name: "US Fulfillment Center delivery",
    type: "shipping",
    service_zones: [
      {
        name: "United States",
        geo_zones: [
          {
            country_code: "us",
            type: "country",
          },
        ],
      },
    ],
  });

  await link.create({
    [Modules.STOCK_LOCATION]: {
      stock_location_id: stockLocation.id,
    },
    [Modules.FULFILLMENT]: {
      fulfillment_set_id: fulfillmentSet.id,
    },
  });

  await createShippingOptionsWorkflow(container).run({
    input: [
      {
        name: "Standard Shipping",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: fulfillmentSet.service_zones[0].id,
        shipping_profile_id: shippingProfile.id,
        type: {
          label: "Standard",
          description: "Ships in 3-5 business days.",
          code: "standard",
        },
        prices: [
          {
            currency_code: "usd",
            amount: 6,
          },
          {
            region_id: region.id,
            amount: 6,
          },
        ],
        rules: [
          {
            attribute: "enabled_in_store",
            value: "true",
            operator: "eq",
          },
          {
            attribute: "is_return",
            value: "false",
            operator: "eq",
          },
        ],
      },
      {
        name: "Express Shipping",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: fulfillmentSet.service_zones[0].id,
        shipping_profile_id: shippingProfile.id,
        type: {
          label: "Express",
          description: "Ships in 1-2 business days.",
          code: "express",
        },
        prices: [
          {
            currency_code: "usd",
            amount: 15,
          },
          {
            region_id: region.id,
            amount: 15,
          },
        ],
        rules: [
          {
            attribute: "enabled_in_store",
            value: "true",
            operator: "eq",
          },
          {
            attribute: "is_return",
            value: "false",
            operator: "eq",
          },
        ],
      },
    ],
  });
  logger.info("Finished seeding fulfillment data.");

  await linkSalesChannelsToStockLocationWorkflow(container).run({
    input: {
      id: stockLocation.id,
      add: [defaultSalesChannel[0].id],
    },
  });
  logger.info("Finished seeding stock location data.");

  logger.info("Seeding publishable API key data...");
  let publishableApiKey: ApiKey | null = null;
  const { data } = await query.graph({
    entity: "api_key",
    fields: ["id"],
    filters: {
      type: "publishable",
    },
  });

  publishableApiKey = data?.[0];

  if (!publishableApiKey) {
    const {
      result: [publishableApiKeyResult],
    } = await createApiKeysWorkflow(container).run({
      input: {
        api_keys: [
          {
            title: "Webshop",
            type: "publishable",
            created_by: "",
          },
        ],
      },
    });

    publishableApiKey = publishableApiKeyResult as ApiKey;
  }

  await linkSalesChannelsToApiKeyWorkflow(container).run({
    input: {
      id: publishableApiKey.id,
      add: [defaultSalesChannel[0].id],
    },
  });
  logger.info("Finished seeding publishable API key data.");

  logger.info("Seeding product categories...");

  // Top-level category tree for the weight & metabolic health vertical.
  const { result: categoryResult } = await createProductCategoriesWorkflow(
    container
  ).run({
    input: {
      product_categories: [
        {
          name: "Weight Management",
          description:
            "OTC products and tools that support healthy weight management routines.",
          is_active: true,
        },
        {
          name: "Metabolic Support",
          description:
            "Supplements formulated to support healthy metabolism as part of a balanced diet.",
          is_active: true,
        },
        {
          name: "Nutrition & Meal Support",
          description:
            "Shakes, fiber blends and hydration to support balanced daily nutrition.",
          is_active: true,
        },
        {
          name: "Monitoring Devices",
          description:
            "At-home devices and kits for tracking body metrics and wellness data.",
          is_active: true,
        },
        {
          name: "Vitamins & Supplements",
          description:
            "Daily vitamins and supplements to help fill common nutritional gaps.",
          is_active: true,
        },
      ],
    },
  });

  const categoryByName = (name: string) =>
    categoryResult.find((cat) => cat.name === name)!;

  // Second pass: sub-categories to demonstrate a nested tree under
  // "Monitoring Devices".
  const { result: subCategoryResult } = await createProductCategoriesWorkflow(
    container
  ).run({
    input: {
      product_categories: [
        {
          name: "Body Composition",
          parent_category_id: categoryByName("Monitoring Devices").id,
          is_active: true,
        },
        {
          name: "Ketone & Glucose",
          parent_category_id: categoryByName("Monitoring Devices").id,
          is_active: true,
        },
      ],
    },
  });
  const subCategoryByName = (name: string) =>
    subCategoryResult.find((cat) => cat.name === name)!;

  logger.info("Finished seeding product categories.");

  logger.info("Seeding product data...");

  await createProductsWorkflow(container).run({
    input: {
      products: [
        {
          title: "Digital Body Composition Scale",
          category_ids: [
            categoryByName("Monitoring Devices").id,
            subCategoryByName("Body Composition").id,
          ],
          description:
            "A Bluetooth smart scale that tracks weight, body fat percentage, muscle mass, and water weight, syncing readings to the companion app so you can follow your progress over time. A supportive tool for anyone building consistent healthy-weight habits.",
          handle: "digital-body-composition-scale",
          weight: 1800,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          metadata: {
            fda_status: "Not a medical device; general wellness product.",
            usage_warnings:
              "Not for use by individuals with an implanted pacemaker or other internal electronic medical device.",
            requires_age_verification: false,
            shipping_states: "all",
          },
          options: [
            {
              title: "Color",
              values: ["Black", "White"],
            },
          ],
          variants: [
            {
              title: "Black",
              sku: "DEVICE-SCALE-BLACK",
              manage_inventory: true,
              options: { Color: "Black" },
              prices: [{ amount: 49, currency_code: "usd" }],
            },
            {
              title: "White",
              sku: "DEVICE-SCALE-WHITE",
              manage_inventory: true,
              options: { Color: "White" },
              prices: [{ amount: 49, currency_code: "usd" }],
            },
          ],
          sales_channels: [{ id: defaultSalesChannel[0].id }],
        },
        {
          title: "Blood Ketone Monitoring Kit",
          category_ids: [
            categoryByName("Monitoring Devices").id,
            subCategoryByName("Ketone & Glucose").id,
          ],
          description:
            "An at-home starter kit with a handheld meter, lancing device, and 10 test strips for tracking your blood ketone readings while following a lower-carbohydrate eating plan. Helps you monitor how your body is responding to your nutrition routine.",
          handle: "blood-ketone-monitoring-kit",
          weight: 350,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          metadata: {
            fda_status:
              "Meter and strips are FDA-cleared for self-testing; sold over-the-counter.",
            usage_warnings:
              "For self-monitoring only. Not a substitute for medical advice. Consult your clinician before making dietary changes.",
            requires_age_verification: false,
            shipping_states: "all",
          },
          options: [{ title: "Kit", values: ["Starter Kit"] }],
          variants: [
            {
              title: "Starter Kit",
              sku: "DEVICE-KETONE-KIT",
              manage_inventory: true,
              options: { Kit: "Starter Kit" },
              prices: [{ amount: 39, currency_code: "usd" }],
            },
          ],
          sales_channels: [{ id: defaultSalesChannel[0].id }],
        },
        {
          title: "Metabolic Multivitamin — 30 Day",
          category_ids: [categoryByName("Vitamins & Supplements").id],
          description:
            "A once-daily multivitamin with B-complex, chromium, and vitamin D to help fill common nutritional gaps and support your everyday energy metabolism as part of a balanced diet. One bottle is a 30-day supply.",
          handle: "metabolic-multivitamin-30-day",
          weight: 180,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          metadata: {
            fda_status:
              "Dietary supplement. This statement has not been evaluated by the FDA. This product is not intended to diagnose, treat, cure, or prevent any disease.",
            active_ingredients:
              "Vitamin D3, B-complex (B1, B2, B3, B6, B12), Folate, Chromium picolinate, Biotin",
            usage_warnings:
              "Do not exceed the recommended daily dose. Consult your healthcare provider before use if pregnant, nursing, or taking medication. Keep out of reach of children.",
            requires_age_verification: false,
            shipping_states: "all",
          },
          options: [{ title: "Supply", values: ["30 Day", "90 Day"] }],
          variants: [
            {
              title: "30 Day",
              sku: "SUP-MULTI-30",
              manage_inventory: true,
              options: { Supply: "30 Day" },
              prices: [{ amount: 24, currency_code: "usd" }],
            },
            {
              title: "90 Day",
              sku: "SUP-MULTI-90",
              manage_inventory: true,
              options: { Supply: "90 Day" },
              prices: [{ amount: 60, currency_code: "usd" }],
            },
          ],
          sales_channels: [{ id: defaultSalesChannel[0].id }],
        },
        {
          title: "Metabolic Support Berberine Capsules",
          category_ids: [categoryByName("Metabolic Support").id],
          description:
            "Standardized berberine HCl capsules that support healthy metabolism and help maintain glucose levels already within the normal range, as part of a balanced diet and active lifestyle. 60 vegetarian capsules.",
          handle: "metabolic-support-berberine-capsules",
          weight: 150,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          metadata: {
            fda_status:
              "Dietary supplement. This statement has not been evaluated by the FDA. This product is not intended to diagnose, treat, cure, or prevent any disease.",
            active_ingredients: "Berberine HCl 500mg (from Berberis aristata)",
            usage_warnings:
              "Not for use by individuals who are pregnant or nursing. Consult your healthcare provider before use, especially if taking medication that affects blood sugar.",
            requires_age_verification: false,
            shipping_states: "all",
          },
          options: [{ title: "Count", values: ["60 Capsules"] }],
          variants: [
            {
              title: "60 Capsules",
              sku: "SUP-BERBERINE-60",
              manage_inventory: true,
              options: { Count: "60 Capsules" },
              prices: [{ amount: 29, currency_code: "usd" }],
            },
          ],
          sales_channels: [{ id: defaultSalesChannel[0].id }],
        },
        {
          title: "Fiber + Prebiotic Daily Blend",
          category_ids: [categoryByName("Nutrition & Meal Support").id],
          description:
            "An unflavored soluble fiber and prebiotic powder that mixes clear into any drink. Supports digestive regularity and helps you feel full between meals as part of a balanced diet. 30 daily servings.",
          handle: "fiber-prebiotic-daily-blend",
          weight: 300,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          metadata: {
            fda_status:
              "Dietary supplement. This statement has not been evaluated by the FDA. This product is not intended to diagnose, treat, cure, or prevent any disease.",
            active_ingredients:
              "Soluble prebiotic fiber (partially hydrolyzed guar fiber), Inulin (chicory root)",
            usage_warnings:
              "Introduce gradually and drink with plenty of water. Discontinue use if you experience persistent digestive discomfort.",
            requires_age_verification: false,
            shipping_states: "all",
          },
          options: [{ title: "Size", values: ["30 Servings"] }],
          variants: [
            {
              title: "30 Servings",
              sku: "NUT-FIBER-30",
              manage_inventory: true,
              options: { Size: "30 Servings" },
              prices: [{ amount: 27, currency_code: "usd" }],
            },
          ],
          sales_channels: [{ id: defaultSalesChannel[0].id }],
        },
        {
          title: "Bariatric Protein Shake — Vanilla",
          category_ids: [categoryByName("Nutrition & Meal Support").id],
          description:
            "A high-protein, low-sugar ready-to-mix shake with 27g of whey protein isolate per serving to support daily protein goals and help you feel satisfied. Formulated to be gentle for those following a portion-controlled eating plan. 14 single-serve packets, vanilla.",
          handle: "bariatric-protein-shake-vanilla",
          weight: 700,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          metadata: {
            fda_status:
              "Food / dietary supplement. This statement has not been evaluated by the FDA. This product is not intended to diagnose, treat, cure, or prevent any disease.",
            active_ingredients:
              "Whey protein isolate, Vitamin/mineral blend. Contains milk. Made in a facility that also processes soy and tree nuts.",
            usage_warnings:
              "Contains milk allergen. Not a sole source of nutrition. Consult your healthcare provider before use if you have had bariatric surgery or a diagnosed medical condition.",
            requires_age_verification: false,
            shipping_states: "all",
          },
          options: [{ title: "Pack", values: ["14 Packets"] }],
          variants: [
            {
              title: "14 Packets",
              sku: "NUT-PROTEIN-VAN-14",
              manage_inventory: true,
              options: { Pack: "14 Packets" },
              prices: [{ amount: 34, currency_code: "usd" }],
            },
          ],
          sales_channels: [{ id: defaultSalesChannel[0].id }],
        },
        {
          title: "Electrolyte Hydration Sticks",
          category_ids: [categoryByName("Nutrition & Meal Support").id],
          description:
            "Sugar-free electrolyte drink mix with sodium, potassium, and magnesium in convenient single-serve sticks. Supports daily hydration when you are active or following a lower-carbohydrate eating plan. 30 sticks, mixed berry.",
          handle: "electrolyte-hydration-sticks",
          weight: 220,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          metadata: {
            fda_status:
              "Food / dietary supplement. This statement has not been evaluated by the FDA. This product is not intended to diagnose, treat, cure, or prevent any disease.",
            active_ingredients:
              "Sodium citrate, Potassium chloride, Magnesium malate, Natural flavors",
            usage_warnings:
              "Contains electrolytes. Consult your healthcare provider before use if you are on a sodium- or potassium-restricted diet.",
            requires_age_verification: false,
            shipping_states: "all",
          },
          options: [{ title: "Count", values: ["30 Sticks"] }],
          variants: [
            {
              title: "30 Sticks",
              sku: "NUT-ELECTROLYTE-30",
              manage_inventory: true,
              options: { Count: "30 Sticks" },
              prices: [{ amount: 22, currency_code: "usd" }],
            },
          ],
          sales_channels: [{ id: defaultSalesChannel[0].id }],
        },
        {
          title: "Appetite Support Konjac Fiber Gummies",
          category_ids: [categoryByName("Weight Management").id],
          description:
            "Chewable glucomannan (konjac root) fiber gummies taken before meals with water. The soluble fiber expands in the stomach to help you feel full so it is easier to stick to sensible portions as part of a balanced diet. 60 gummies.",
          handle: "appetite-support-konjac-fiber-gummies",
          weight: 260,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          metadata: {
            fda_status:
              "Dietary supplement. This statement has not been evaluated by the FDA. This product is not intended to diagnose, treat, cure, or prevent any disease.",
            active_ingredients: "Glucomannan (Amorphophallus konjac root) 1g",
            usage_warnings:
              "Take with a full glass of water 30 minutes before meals. Do not take immediately before lying down. Not suitable for individuals with difficulty swallowing.",
            requires_age_verification: false,
            shipping_states: "all",
          },
          options: [{ title: "Count", values: ["60 Gummies"] }],
          variants: [
            {
              title: "60 Gummies",
              sku: "WM-KONJAC-60",
              manage_inventory: true,
              options: { Count: "60 Gummies" },
              prices: [{ amount: 26, currency_code: "usd" }],
            },
          ],
          sales_channels: [{ id: defaultSalesChannel[0].id }],
        },
        {
          title: "Portion Control Meal Prep Container Set",
          category_ids: [categoryByName("Weight Management").id],
          description:
            "A 14-piece set of portion-marked, BPA-free meal prep containers with a companion guide to help you plan balanced, portion-controlled meals throughout the week. A practical tool for building consistent healthy-eating habits.",
          handle: "portion-control-meal-prep-container-set",
          weight: 900,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          metadata: {
            fda_status: "General merchandise; not a medical device.",
            usage_warnings:
              "Dishwasher safe (top rack). Not intended for stovetop or oven use.",
            requires_age_verification: false,
            shipping_states: "all",
          },
          options: [{ title: "Set", values: ["14-Piece Set"] }],
          variants: [
            {
              title: "14-Piece Set",
              sku: "WM-MEALPREP-14",
              manage_inventory: true,
              options: { Set: "14-Piece Set" },
              prices: [{ amount: 32, currency_code: "usd" }],
            },
          ],
          sales_channels: [{ id: defaultSalesChannel[0].id }],
        },
      ],
    },
  });
  logger.info("Finished seeding product data.");

  logger.info("Seeding inventory levels.");

  const { data: inventoryItems } = await query.graph({
    entity: "inventory_item",
    fields: ["id"],
  });

  const inventoryLevels: CreateInventoryLevelInput[] = [];
  for (const inventoryItem of inventoryItems) {
    const inventoryLevel = {
      location_id: stockLocation.id,
      stocked_quantity: 1000000,
      inventory_item_id: inventoryItem.id,
    };
    inventoryLevels.push(inventoryLevel);
  }

  await createInventoryLevelsWorkflow(container).run({
    input: {
      inventory_levels: inventoryLevels,
    },
  });

  logger.info("Finished seeding inventory levels data.");
}
