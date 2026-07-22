/**
 * Canonical strict request schemas for the Saludlink website.
 *
 * Each schema:
 *  - uses `.strict()` (unknown properties → HTTP 400),
 *  - restricts free-text fields to commerce-safe content via {@link phiSafeText},
 *  - is wrapped with {@link withNoPhi} so a prohibited key anywhere in the tree
 *    is rejected as defense-in-depth.
 *
 * Import these in route handlers and Medusa endpoints; never hand-roll a
 * non-strict `z.object()` for a public input.
 *
 * @packageDocumentation
 */

import { z } from "zod"
import {
  strictObject,
  withNoPhi,
  phiSafeText,
  emailField,
  nameField,
  phoneField,
  localeField,
  idField,
  addressSchema,
} from "./zod-helpers"

/** Account registration. Identity + auth only. */
export const RegistrationSchema = withNoPhi(
  strictObject({
    email: emailField(),
    password: z.string().min(8).max(256),
    first_name: nameField(),
    last_name: nameField(),
    phone: phoneField().optional(),
    marketing_opt_in: z.boolean().optional(),
    locale: localeField().optional(),
  })
)
export type Registration = z.infer<typeof RegistrationSchema>

/** A shipping address submission. */
export const ShippingAddressSchema = withNoPhi(addressSchema())
export type ShippingAddress = z.infer<typeof ShippingAddressSchema>

/** Editable customer profile fields. */
export const CustomerProfileSchema = withNoPhi(
  strictObject({
    first_name: nameField().optional(),
    last_name: nameField().optional(),
    phone: phoneField().optional(),
    company_name: nameField().optional(),
    locale: localeField().optional(),
    marketing_opt_in: z.boolean().optional(),
  })
)
export type CustomerProfile = z.infer<typeof CustomerProfileSchema>

/** Newsletter / marketing signup. */
export const NewsletterSchema = withNoPhi(
  strictObject({
    email: emailField(),
    locale: localeField().optional(),
    source: z.string().trim().max(64).optional(),
    consent: z.literal(true, {
      errorMap: () => ({ message: "Consent is required to subscribe." }),
    }),
  })
)
export type Newsletter = z.infer<typeof NewsletterSchema>

/** Checkout submission. Order + payment references only — no clinical data. */
export const CheckoutSchema = withNoPhi(
  strictObject({
    cart_id: idField(),
    email: emailField(),
    shipping_address: addressSchema(),
    billing_address: addressSchema().optional(),
    shipping_method_id: idField().optional(),
    /** Stripe PaymentIntent / payment-session reference, never card data. */
    payment_provider_id: idField().optional(),
    discount_code: z.string().trim().max(64).optional(),
    gift_message: phiSafeText({ min: 0, max: 300 }).optional(),
    locale: localeField().optional(),
  })
)
export type Checkout = z.infer<typeof CheckoutSchema>

/**
 * Contact form. The message is a free-text field, so it is scanned for clinical
 * narratives — a submission containing medical information is rejected and the
 * user is redirected to the telemedicine portal.
 */
export const ContactFormSchema = withNoPhi(
  strictObject({
    name: nameField(),
    email: emailField(),
    subject: z.string().trim().min(1).max(160),
    message: phiSafeText({ min: 1, max: 2000 }),
    locale: localeField().optional(),
  })
)
export type ContactForm = z.infer<typeof ContactFormSchema>

/** Order/product support request. Description is PHI-scanned free text. */
export const SupportRequestSchema = withNoPhi(
  strictObject({
    email: emailField(),
    order_id: idField().optional(),
    category: z.enum([
      "order",
      "shipping",
      "return",
      "billing",
      "product",
      "account",
      "other",
    ]),
    description: phiSafeText({ min: 1, max: 2000 }),
    locale: localeField().optional(),
  })
)
export type SupportRequest = z.infer<typeof SupportRequestSchema>

/** Product review submission. Title/body are PHI-scanned free text. */
export const ReviewSubmissionSchema = withNoPhi(
  strictObject({
    product_id: idField(),
    rating: z.number().int().min(1).max(5),
    title: phiSafeText({ min: 1, max: 120 }),
    body: phiSafeText({ min: 1, max: 2000 }),
    display_name: nameField().optional(),
  })
)
export type ReviewSubmission = z.infer<typeof ReviewSubmissionSchema>

/**
 * Product search. Intentionally NOT PHI-scanned: "Blood Pressure Monitor",
 * "Glucose Monitor", and "Vitamin D" are legitimate commerce queries. Only
 * length-bounded to prevent abuse.
 */
export const ProductSearchSchema = strictObject({
  q: z.string().trim().min(1).max(120),
  page: z.number().int().min(1).max(1000).optional(),
  category: z.string().trim().max(120).optional(),
})
export type ProductSearch = z.infer<typeof ProductSearchSchema>

/**
 * A registry of the canonical schemas keyed by a stable name, handy for generic
 * middleware wiring and documentation.
 */
export const REQUEST_SCHEMAS = {
  registration: RegistrationSchema,
  shippingAddress: ShippingAddressSchema,
  customerProfile: CustomerProfileSchema,
  newsletter: NewsletterSchema,
  checkout: CheckoutSchema,
  contactForm: ContactFormSchema,
  supportRequest: SupportRequestSchema,
  reviewSubmission: ReviewSubmissionSchema,
  productSearch: ProductSearchSchema,
} as const

/** Union of the registered schema names. */
export type RequestSchemaName = keyof typeof REQUEST_SCHEMAS
