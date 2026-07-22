import { describe, it, expect } from "vitest"
import {
  RegistrationSchema,
  ShippingAddressSchema,
  NewsletterSchema,
  CheckoutSchema,
  ContactFormSchema,
  SupportRequestSchema,
  ReviewSubmissionSchema,
  ProductSearchSchema,
} from "../schemas"

describe("strict schemas — reject unknown properties", () => {
  it("rejects an extra property on registration (would be HTTP 400)", () => {
    const r = RegistrationSchema.safeParse({
      email: "a@b.com",
      password: "hunter2hunter2",
      first_name: "Alex",
      last_name: "Rivera",
      is_admin: true, // unknown → strict rejects
    })
    expect(r.success).toBe(false)
  })

  it("accepts a valid registration", () => {
    const r = RegistrationSchema.safeParse({
      email: "Alex@Example.com",
      password: "hunter2hunter2",
      first_name: "Alex",
      last_name: "Rivera",
      marketing_opt_in: true,
    })
    expect(r.success).toBe(true)
    // email normalized to lower-case
    if (r.success) expect(r.data.email).toBe("alex@example.com")
  })
})

describe("strict schemas — reject PHI", () => {
  it("rejects a registration carrying a prohibited field", () => {
    const r = RegistrationSchema.safeParse({
      email: "a@b.com",
      password: "hunter2hunter2",
      first_name: "Alex",
      last_name: "Rivera",
      diagnosis: "flu",
    })
    expect(r.success).toBe(false)
  })

  it("accepts a clean shipping address", () => {
    const r = ShippingAddressSchema.safeParse({
      first_name: "Alex",
      last_name: "Rivera",
      address_1: "1 Market St",
      city: "Austin",
      province: "TX",
      postal_code: "78701",
      country_code: "us",
    })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.country_code).toBe("US")
  })
})

describe("newsletter", () => {
  it("requires explicit consent", () => {
    expect(
      NewsletterSchema.safeParse({ email: "a@b.com", consent: false }).success
    ).toBe(false)
    expect(
      NewsletterSchema.safeParse({ email: "a@b.com", consent: true }).success
    ).toBe(true)
  })
})

describe("checkout", () => {
  it("accepts order + payment references, no clinical data", () => {
    const r = CheckoutSchema.safeParse({
      cart_id: "cart_1",
      email: "a@b.com",
      shipping_address: {
        first_name: "A",
        last_name: "B",
        address_1: "1 St",
        city: "Austin",
        postal_code: "78701",
        country_code: "US",
      },
      payment_provider_id: "pi_123",
      discount_code: "SAVE10",
      locale: "en",
    })
    expect(r.success).toBe(true)
  })

  it("rejects a clinical gift message", () => {
    const r = CheckoutSchema.safeParse({
      cart_id: "cart_1",
      email: "a@b.com",
      shipping_address: {
        first_name: "A",
        last_name: "B",
        address_1: "1 St",
        city: "Austin",
        postal_code: "78701",
        country_code: "US",
      },
      gift_message: "Take your medication twice daily",
    })
    expect(r.success).toBe(false)
  })
})

describe("free-text forms — clinical narratives rejected", () => {
  it("rejects a contact form describing symptoms", () => {
    const r = ContactFormSchema.safeParse({
      name: "Alex",
      email: "a@b.com",
      subject: "Question",
      message: "I have symptoms and need a prescription refill.",
    })
    expect(r.success).toBe(false)
  })

  it("accepts a legitimate order question", () => {
    const r = ContactFormSchema.safeParse({
      name: "Alex",
      email: "a@b.com",
      subject: "Where is my order?",
      message: "My order #1234 has not shipped yet. Can you help?",
    })
    expect(r.success).toBe(true)
  })

  it("rejects a support request with a diagnosis", () => {
    const r = SupportRequestSchema.safeParse({
      email: "a@b.com",
      category: "product",
      description: "My doctor gave me a diagnosis of hypertension.",
    })
    expect(r.success).toBe(false)
  })

  it("accepts a product review that mentions a product benefit", () => {
    const r = ReviewSubmissionSchema.safeParse({
      product_id: "prod_1",
      rating: 5,
      title: "Great monitor",
      body: "Easy to use and accurate. Arrived quickly.",
    })
    expect(r.success).toBe(true)
  })
})

describe("product search — commerce, never blocked", () => {
  it.each(["Blood Pressure Monitor", "Vitamin D", "Glucose Monitor"])(
    "allows %s",
    (q) => {
      expect(ProductSearchSchema.safeParse({ q }).success).toBe(true)
    }
  )

  it("still rejects unknown props (strict)", () => {
    expect(
      ProductSearchSchema.safeParse({ q: "vitamin", inject: true }).success
    ).toBe(false)
  })
})
