import { ProductStatus } from "@medusajs/framework/utils"

/**
 * Saludlink's compounded-Rx catalog — the 3 SKUs sold on the site
 * (tirzepatide, semaglutide, NAD+ injection kits). Shared between `seed.ts`
 * (fresh installs) and `migrate-catalog-rx.ts` (already-seeded databases) so
 * the product copy/compliance metadata can never drift between the two.
 *
 * Every SKU is age-restricted (18+) and carries the same physician-review /
 * refund-before-shipment guarantee — see PHYSICIAN_REVIEW_NOTE.
 */

const PHYSICIAN_REVIEW_NOTE =
  "Prescription required. A licensed physician on our care team reviews and must approve every order before it is dispensed and shipped — if the physician does not approve treatment, you are refunded in full. The physician may contact you within 24 hours of purchase if additional information is needed."

const RX_SHIPPING_STATES =
  "Shipped only to states where our affiliated pharmacy and prescribing providers are licensed — see Licensing & State Availability."

export type BuildRxProductsInput = {
  shippingProfileId: string
  salesChannelId: string
}

export function buildRxProducts({
  shippingProfileId,
  salesChannelId,
}: BuildRxProductsInput) {
  return [
    {
      title: "Tirzepatide Injection At-Home",
      description: [
        "Tirzepatide compounded with glycine and vitamin B12 — a physician-reviewed, at-home injection kit dispensed only against a valid, patient-specific prescription. Tirzepatide is a dual GIP/GLP-1 receptor agonist; by mimicking these incretin hormones it can help enhance insulin secretion, slow gastric emptying, and support appetite regulation as part of a physician-guided weight-management plan.",
        "Glycine is an amino acid studied for its role in helping preserve lean muscle mass during weight loss. Vitamin B12 is added to help offset the nausea some patients experience on GLP-1/GIP therapy and to help address a common nutrient gap during weight loss.",
        "Each kit includes 4 pre-measured injections dosed to your prescription (2.5mg–15mg), syringes, alcohol pads, and ongoing physician access, plus a video administration tutorial after purchase. Injections are self-administered once weekly, subcutaneously in the abdomen or thigh, on the same day each week.",
        PHYSICIAN_REVIEW_NOTE,
      ].join("\n\n"),
      handle: "tirzepatide-injection-at-home",
      weight: 200,
      status: ProductStatus.PUBLISHED,
      shipping_profile_id: shippingProfileId,
      metadata: {
        fda_status:
          "This is a compounded medication containing tirzepatide combined with glycine and vitamin B12, prepared under Section 503A of the Federal Food, Drug, and Cosmetic Act and dispensed only pursuant to a valid, patient-specific prescription from a licensed healthcare provider. It has not been approved by the FDA and is not affiliated with, endorsed by, or intended to replace the FDA-approved product manufactured by Eli Lilly. Not for resale, bulk distribution, or office use.",
        active_ingredients:
          "Tirzepatide (2.5mg–15mg per dose, per prescription), Glycine, Vitamin B12 (cyanocobalamin) — compounded per patient-specific prescription.",
        usage_warnings: `${PHYSICIAN_REVIEW_NOTE} Self-administered once-weekly subcutaneous injection into the abdomen or thigh; a video tutorial is provided after purchase. Common side effects include nausea and reduced muscle mass — the added glycine and B12 are intended to help offset both. Not evaluated for use during pregnancy or nursing. Discuss all medications and health conditions with your prescribing physician.`,
        requires_age_verification: true,
        min_age: 18,
        prescription_required: true,
        shipping_states: RX_SHIPPING_STATES,
      },
      options: [
        {
          title: "Dose",
          values: ["2.5mg", "5mg", "7.5mg", "10mg", "12.5mg", "15mg"],
        },
      ],
      variants: [
        {
          title: "2.5mg (4 Injections)",
          sku: "RX-TIRZ-2.5MG",
          manage_inventory: true,
          options: { Dose: "2.5mg" },
          prices: [{ amount: 145, currency_code: "usd" }],
        },
        {
          title: "5mg (4 Injections)",
          sku: "RX-TIRZ-5MG",
          manage_inventory: true,
          options: { Dose: "5mg" },
          prices: [{ amount: 299, currency_code: "usd" }],
        },
        {
          title: "7.5mg (4 Injections)",
          sku: "RX-TIRZ-7.5MG",
          manage_inventory: true,
          options: { Dose: "7.5mg" },
          prices: [{ amount: 399, currency_code: "usd" }],
        },
        {
          title: "10mg (4 Injections)",
          sku: "RX-TIRZ-10MG",
          manage_inventory: true,
          options: { Dose: "10mg" },
          prices: [{ amount: 449, currency_code: "usd" }],
        },
        {
          title: "12.5mg (4 Injections)",
          sku: "RX-TIRZ-12.5MG",
          manage_inventory: true,
          options: { Dose: "12.5mg" },
          prices: [{ amount: 499, currency_code: "usd" }],
        },
        {
          title: "15mg (4 Injections)",
          sku: "RX-TIRZ-15MG",
          manage_inventory: true,
          options: { Dose: "15mg" },
          prices: [{ amount: 599, currency_code: "usd" }],
        },
      ],
      sales_channels: [{ id: salesChannelId }],
    },
    {
      title: "Semaglutide HomeKit",
      description: [
        "Semaglutide combined with vitamin B12, compounded and dispensed direct from our pharmacy against a valid, patient-specific prescription. Semaglutide is a GLP-1 receptor agonist that mimics a hormone your gut releases after eating, acting on appetite-regulating areas of the brain to help you eat less as part of a physician-guided weight-management plan. Vitamin B12 is added to support energy and help offset common side effects.",
        "This product follows a mandatory titration schedule: all patients start at Month 1 (0.25mg) and increase gradually through Month 4, with a maintenance dose available for up to 8 months depending on your goals and your physician's guidance.",
        "Each HomeKit includes a one-month supply of injections, syringes, alcohol pads, and ongoing physician access, plus a video administration tutorial after purchase. Injections are self-administered once weekly, subcutaneously in the abdomen or thigh.",
        `${PHYSICIAN_REVIEW_NOTE} Ships 2-Day or Overnight; no refrigeration is required in transit, but please refrigerate once received and opened.`,
      ].join("\n\n"),
      handle: "semaglutide-homekit",
      weight: 200,
      status: ProductStatus.PUBLISHED,
      shipping_profile_id: shippingProfileId,
      metadata: {
        fda_status:
          "This is a compounded medication containing semaglutide combined with vitamin B12, prepared under Section 503A of the Federal Food, Drug, and Cosmetic Act and dispensed only pursuant to a valid, patient-specific prescription from a licensed healthcare provider. It has not been approved by the FDA and is not affiliated with, endorsed by, or intended to replace the FDA-approved products manufactured by Novo Nordisk (Ozempic®/Wegovy®). Not for resale, bulk distribution, or office use.",
        active_ingredients:
          "Semaglutide (0.25mg–2.5mg per dose, per titration schedule and prescription), Vitamin B12 — compounded per patient-specific prescription.",
        usage_warnings: `${PHYSICIAN_REVIEW_NOTE} All patients must start with the Month 1 dose; dosage increases gradually in Month 2, 3, and 4, with a maintenance dose available thereafter. Self-administered once-weekly subcutaneous injection into the abdomen or thigh; a video tutorial is provided after purchase. Common side effect is nausea. Not evaluated for use during pregnancy or nursing. Discuss all medications and health conditions with your prescribing physician.`,
        requires_age_verification: true,
        min_age: 18,
        prescription_required: true,
        shipping_states: RX_SHIPPING_STATES,
      },
      options: [
        {
          title: "Plan",
          values: [
            "Month 1 (0.25mg)",
            "Month 2 (0.5mg)",
            "Month 3 (1.0mg)",
            "Month 4 (1.7mg)",
            "Maintenance (2.5mg)",
          ],
        },
      ],
      variants: [
        {
          title: "Month 1 — 0.25mg (4 Injections)",
          sku: "RX-SEMA-M1-0.25MG",
          manage_inventory: true,
          options: { Plan: "Month 1 (0.25mg)" },
          prices: [{ amount: 125, currency_code: "usd" }],
        },
        {
          title: "Month 2 — 0.5mg (4 Injections)",
          sku: "RX-SEMA-M2-0.5MG",
          manage_inventory: true,
          options: { Plan: "Month 2 (0.5mg)" },
          prices: [{ amount: 245, currency_code: "usd" }],
        },
        {
          title: "Month 3 — 1.0mg (4 Injections)",
          sku: "RX-SEMA-M3-1.0MG",
          manage_inventory: true,
          options: { Plan: "Month 3 (1.0mg)" },
          prices: [{ amount: 295, currency_code: "usd" }],
        },
        {
          title: "Month 4 — 1.7mg (4 Injections)",
          sku: "RX-SEMA-M4-1.7MG",
          manage_inventory: true,
          options: { Plan: "Month 4 (1.7mg)" },
          prices: [{ amount: 345, currency_code: "usd" }],
        },
        {
          title: "Maintenance — 2.5mg (4 Injections)",
          sku: "RX-SEMA-MAINT-2.5MG",
          manage_inventory: true,
          options: { Plan: "Maintenance (2.5mg)" },
          prices: [{ amount: 395, currency_code: "usd" }],
        },
      ],
      sales_channels: [{ id: salesChannelId }],
    },
    {
      title: "NAD+ (Active Form) Injection HomeKit",
      description: [
        "Activated NAD+ (nicotinamide adenine dinucleotide) injections, compounded and dispensed against a physician-reviewed, patient-specific order. NAD+ is a coenzyme found in every living cell and a required input for producing cellular energy (ATP) — levels naturally decline with age. Supporting NAD+ is studied for its role in energy, focus, exercise recovery, and healthy aging.",
        "Each HomeKit is a one-month supply of activated NAD+ injections — available in 500 mg and 1000 mg strengths — with sub-Q syringes, alcohol pads, and ongoing physician access, plus a video administration tutorial after purchase. Injections are self-administered subcutaneously into the abdominal fatty area, three times per week.",
        `${PHYSICIAN_REVIEW_NOTE}`,
      ].join("\n\n"),
      handle: "nad-plus-injection-homekit",
      weight: 300,
      status: ProductStatus.PUBLISHED,
      shipping_profile_id: shippingProfileId,
      metadata: {
        fda_status:
          "This is a compounded NAD+ (nicotinamide adenine dinucleotide) injection prepared under Section 503A of the Federal Food, Drug, and Cosmetic Act and dispensed only pursuant to a valid, patient-specific order reviewed by a licensed physician on our care team. This statement has not been evaluated by the FDA; NAD+ injection is not intended to diagnose, treat, cure, or prevent any disease. Not for resale, bulk distribution, or office use.",
        active_ingredients:
          "Nicotinamide Adenine Dinucleotide (NAD+), available in 500 mg and 1000 mg strengths — compounded per patient-specific order.",
        usage_warnings: `${PHYSICIAN_REVIEW_NOTE} Self-administered subcutaneous injection (0.2 mL) into the abdominal fatty area, three times per week. You may feel lightheaded after injection — sit for 5–10 minutes before standing. Not evaluated for use during pregnancy or nursing. Discuss all medications and health conditions with your prescribing physician.`,
        requires_age_verification: true,
        min_age: 18,
        prescription_required: true,
        shipping_states: RX_SHIPPING_STATES,
      },
      options: [{ title: "Strength", values: ["500mg", "1000mg"] }],
      variants: [
        {
          title: "500mg",
          sku: "RX-NAD-500MG",
          manage_inventory: true,
          options: { Strength: "500mg" },
          prices: [{ amount: 49.99, currency_code: "usd" }],
        },
        {
          title: "1000mg",
          sku: "RX-NAD-1000MG",
          manage_inventory: true,
          options: { Strength: "1000mg" },
          prices: [{ amount: 69.99, currency_code: "usd" }],
        },
      ],
      sales_channels: [{ id: salesChannelId }],
    },
  ]
}
