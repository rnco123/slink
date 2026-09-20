import {
  DEFAULT_LIMIT,
  LookupSchema,
  authenticateMcm,
  decodeCursor,
  encodeCursor,
  orderNo,
  parseOrderNo,
  serializeOrder,
} from "../shared"

/**
 * Unit coverage for the MCM-Go read API's pure logic: order_no mapping,
 * serialization (cardinality + PHI boundary), strict validation, paging and the
 * bearer guard. The HTTP round-trip lives in
 * integration-tests/http/mcm-orders.spec.ts, which needs a Postgres.
 */

const ORDER_FIXTURE = {
  id: "order_01J",
  display_id: 4821,
  custom_display_id: null,
  customer_id: "cus_01J",
  email: "sarah@example.com",
  status: "completed",
  currency_code: "usd",
  created_at: new Date("2026-07-28T14:02:00Z"),
  metadata: null,
  total: 341,
  shipping_total: 0,
  tax_total: 0,
  shipping_address: {
    first_name: "Sarah",
    last_name: "Khan",
    phone: "+15125550148",
  },
  items: [
    {
      id: "li_01J",
      product_id: "prod_01J",
      variant_id: "variant_01J",
      variant_sku: "TIRZ-10MG-4W",
      title: "Tirzepatide 10 mg — 4 week supply",
      quantity: 1,
      unit_price: 299,
      subtotal: 299,
    },
    {
      id: "li_01K",
      product_id: "prod_01K",
      variant_id: "variant_01K",
      variant_sku: "SHARPS-BIN-1L",
      title: "Sharps disposal container 1 L",
      quantity: 2,
      unit_price: 21,
      subtotal: 42,
    },
  ],
}

describe("order_no", () => {
  it("prefers custom_display_id when set", () => {
    expect(orderNo({ custom_display_id: "SL-9000", display_id: 12 })).toBe(
      "SL-9000"
    )
  })

  it("falls back to SL-<display_id>, matching MCM-Go's documented format", () => {
    expect(orderNo({ custom_display_id: null, display_id: 4821 })).toBe(
      "SL-4821"
    )
  })

  it("is stable across repeated calls (MCM-Go dedupes on it)", () => {
    const a = orderNo({ custom_display_id: null, display_id: 7 })
    const b = orderNo({ custom_display_id: null, display_id: 7 })
    expect(a).toBe(b)
  })

  it("resolves prefixed, bare and custom forms on lookup", () => {
    expect(parseOrderNo("SL-3").displayId).toBe(3)
    expect(parseOrderNo("sl-3").displayId).toBe(3)
    expect(parseOrderNo("3").displayId).toBe(3)
    expect(parseOrderNo("ORD-XYZ").displayId).toBeNull()
    expect(parseOrderNo("ORD-XYZ").custom).toBe("ORD-XYZ")
    expect(parseOrderNo("SL-3x").displayId).toBeNull()
  })
})

describe("serializeOrder — cardinality", () => {
  it("returns every line item, never collapsed to a first-item summary", () => {
    const out = serializeOrder(ORDER_FIXTURE)
    expect(Array.isArray(out.items)).toBe(true)
    expect(out.items).toHaveLength(2)
    expect(out.items.map((i) => i.sku)).toEqual([
      "TIRZ-10MG-4W",
      "SHARPS-BIN-1L",
    ])
  })

  it("gives every item its own quantity and money", () => {
    const [med, sharps] = serializeOrder(ORDER_FIXTURE).items
    expect(med.quantity).toBe(1)
    expect(med.unit_price).toBe(299)
    expect(sharps.quantity).toBe(2)
    expect(sharps.unit_price).toBe(21)
    expect(sharps.subtotal).toBe(42)
  })

  it("keeps two lines of the same product with different variants distinct", () => {
    const out = serializeOrder({
      ...ORDER_FIXTURE,
      items: [
        {
          id: "li_a",
          product_id: "prod_same",
          variant_id: "variant_5mg",
          variant_sku: "T-5",
          title: "T 5 mg",
          quantity: 1,
          unit_price: 100,
          subtotal: 100,
        },
        {
          id: "li_b",
          product_id: "prod_same",
          variant_id: "variant_10mg",
          variant_sku: "T-10",
          title: "T 10 mg",
          quantity: 1,
          unit_price: 200,
          subtotal: 200,
        },
      ],
    })
    expect(out.items).toHaveLength(2)
    expect(new Set(out.items.map((i) => i.line_item_id)).size).toBe(2)
    expect(new Set(out.items.map((i) => i.variant_id)).size).toBe(2)
    expect(out.items[0].product_id).toBe(out.items[1].product_id)
  })

  it("emits line_item_id so identical-looking lines stay reconcilable", () => {
    const out = serializeOrder({
      ...ORDER_FIXTURE,
      items: [
        {
          id: "li_x",
          product_id: "p",
          variant_id: "v",
          variant_sku: "S",
          title: "T",
          quantity: 1,
          unit_price: 10,
          subtotal: 10,
        },
        {
          id: "li_y",
          product_id: "p",
          variant_id: "v",
          variant_sku: "S",
          title: "T",
          quantity: 1,
          unit_price: 10,
          subtotal: 10,
        },
      ],
    })
    expect(out.items.map((i) => i.line_item_id)).toEqual(["li_x", "li_y"])
  })

  it("reconciles per-item subtotals against the order total", () => {
    const out = serializeOrder(ORDER_FIXTURE)
    const itemSum = out.items.reduce((n, i) => n + i.subtotal, 0)
    expect(itemSum + out.shipping_total + out.tax_total).toBeCloseTo(
      out.total,
      2
    )
  })

  it("reconciles when shipping is non-zero", () => {
    const out = serializeOrder({
      ...ORDER_FIXTURE,
      total: 55.99,
      shipping_total: 6,
      tax_total: 0,
      items: [
        {
          id: "li",
          product_id: "p",
          variant_id: "v",
          variant_sku: "S",
          title: "T",
          quantity: 1,
          unit_price: 49.99,
          subtotal: 49.99,
        },
      ],
    })
    const itemSum = out.items.reduce((n, i) => n + i.subtotal, 0)
    expect(itemSum + out.shipping_total + out.tax_total).toBeCloseTo(
      out.total,
      2
    )
  })

  it("falls back to unit_price * quantity when subtotal is absent", () => {
    const out = serializeOrder({
      ...ORDER_FIXTURE,
      items: [
        {
          id: "li",
          product_id: "p",
          variant_id: "v",
          variant_sku: "S",
          title: "T",
          quantity: 3,
          unit_price: 7,
        },
      ],
    })
    expect(out.items[0].subtotal).toBe(21)
  })

  it("returns an empty items array rather than omitting the key", () => {
    const out = serializeOrder({ ...ORDER_FIXTURE, items: [] })
    expect(out.items).toEqual([])
  })
})

describe("serializeOrder — identity and status", () => {
  it("exposes customer.id as saludlink_code, with email, on every order", () => {
    const out = serializeOrder(ORDER_FIXTURE)
    expect(out.saludlink_code).toBe("cus_01J")
    expect(out.email).toBe("sarah@example.com")
  })

  it("repeats saludlink_code across that customer's orders", () => {
    const a = serializeOrder({ ...ORDER_FIXTURE, id: "order_a", display_id: 1 })
    const b = serializeOrder({ ...ORDER_FIXTURE, id: "order_b", display_id: 2 })
    expect(a.saludlink_code).toBe(b.saludlink_code)
    expect(a.order_no).not.toBe(b.order_no)
  })

  it("takes buyer name/phone from the address when the customer record is bare", () => {
    const out = serializeOrder(ORDER_FIXTURE)
    expect(out.first_name).toBe("Sarah")
    expect(out.last_name).toBe("Khan")
    expect(out.phone).toBe("+15125550148")
  })

  it.each(["canceled", "completed", "pending", "archived", "draft"])(
    "returns %s orders with their real status",
    (status) => {
      expect(serializeOrder({ ...ORDER_FIXTURE, status }).status).toBe(status)
    }
  )

  it("defaults credits to 2, matching MCM-Go's own default", () => {
    expect(serializeOrder(ORDER_FIXTURE).credits).toBe(2)
  })

  it("reads credits from order metadata when present, at order level", () => {
    const out = serializeOrder({ ...ORDER_FIXTURE, metadata: { credits: 5 } })
    expect(out.credits).toBe(5)
    expect(Object.keys(out.items[0])).not.toContain("credits")
  })
})

describe("claim key fields", () => {
  const WITH_KEY = {
    ...ORDER_FIXTURE,
    metadata: {
      credits: 2,
      mcm_key_hash:
        "3affe3d63a69152c6024cf0bc4dce7f01ffd04d4a0ef648ab399e87d32a91812",
      mcm_key_last4: "EFGH",
    },
  }

  it("returns the stored hash and last4", () => {
    const out = serializeOrder(WITH_KEY)
    expect(out.secret_key_hash).toBe(
      "3affe3d63a69152c6024cf0bc4dce7f01ffd04d4a0ef648ab399e87d32a91812"
    )
    expect(out.secret_key_last4).toBe("EFGH")
  })

  it("returns null for both on an order placed before keys shipped", () => {
    const out = serializeOrder({ ...ORDER_FIXTURE, metadata: null })
    expect(out.secret_key_hash).toBeNull()
    expect(out.secret_key_last4).toBeNull()
  })

  it("does not error when metadata holds other keys but no claim key", () => {
    const out = serializeOrder({ ...ORDER_FIXTURE, metadata: { credits: 3 } })
    expect(out.secret_key_hash).toBeNull()
    expect(out.secret_key_last4).toBeNull()
    expect(out.credits).toBe(3)
  })

  it("treats a blank or non-string value as absent", () => {
    const out = serializeOrder({
      ...ORDER_FIXTURE,
      metadata: { mcm_key_hash: "   ", mcm_key_last4: 1234 },
    })
    expect(out.secret_key_hash).toBeNull()
    expect(out.secret_key_last4).toBeNull()
  })

  it("never echoes a plaintext key that somehow reached metadata", () => {
    const out = serializeOrder({
      ...ORDER_FIXTURE,
      metadata: { ...WITH_KEY.metadata, mcm_claim_key: "PlainLeak123" },
    })
    expect(JSON.stringify(out)).not.toContain("PlainLeak123")
  })

  it("keeps both endpoints on one shape — the fields are on the order object", () => {
    const out = serializeOrder(WITH_KEY)
    expect(Object.keys(out)).toEqual(
      expect.arrayContaining(["secret_key_hash", "secret_key_last4"])
    )
  })
})

describe("PHI boundary", () => {
  const FORBIDDEN = [
    "diagnosis",
    "medication",
    "medications",
    "prescription",
    "prescriptions",
    "dose",
    "dosage",
    "clinical_notes",
    "soap",
    "allergies",
    "visit_notes",
    "encounter_id",
    "provider_id",
    "patient_id",
    "emr_id",
    "icd",
    "cpt",
    "ndc",
  ]

  it("returns no forbidden field at order or item level", () => {
    const out = serializeOrder({ ...ORDER_FIXTURE, metadata: { credits: 2 } })
    const keys = [...Object.keys(out), ...Object.keys(out.items[0])].map((k) =>
      k.toLowerCase()
    )
    for (const bad of FORBIDDEN) expect(keys).not.toContain(bad)
  })

  it("does not leak arbitrary order metadata into the response", () => {
    const out: any = serializeOrder({
      ...ORDER_FIXTURE,
      metadata: { credits: 2, diagnosis: "E66.9", internal_note: "x" },
    })
    expect(JSON.stringify(out)).not.toContain("E66.9")
    expect(out.metadata).toBeUndefined()
  })

  it("keeps a clinical-sounding product title as commerce data (rule 7)", () => {
    const out = serializeOrder(ORDER_FIXTURE)
    expect(out.items[0].title).toBe("Tirzepatide 10 mg — 4 week supply")
    expect(out.items[0]).toHaveProperty("sku")
    expect(out.items[0]).not.toHaveProperty("medication")
    expect(out.items[0]).not.toHaveProperty("dose")
  })
})

describe("LookupSchema", () => {
  it("rejects an unknown key with a field-level issue", () => {
    const r = LookupSchema.safeParse({
      saludlink_code: "cus_1",
      diagnosis: "x",
    })
    expect(r.success).toBe(false)
  })

  it("requires at least one identifier", () => {
    expect(LookupSchema.safeParse({}).success).toBe(false)
    expect(LookupSchema.safeParse({ limit: 10 }).success).toBe(false)
  })

  it("accepts either identifier", () => {
    expect(LookupSchema.safeParse({ saludlink_code: "cus_1" }).success).toBe(
      true
    )
    expect(LookupSchema.safeParse({ email: "a@b.com" }).success).toBe(true)
  })

  it("rejects a malformed email and an out-of-range limit", () => {
    expect(LookupSchema.safeParse({ email: "nope" }).success).toBe(false)
    expect(
      LookupSchema.safeParse({ saludlink_code: "c", limit: 0 }).success
    ).toBe(false)
    expect(
      LookupSchema.safeParse({ saludlink_code: "c", limit: 101 }).success
    ).toBe(false)
    expect(
      LookupSchema.safeParse({ saludlink_code: "c", limit: 100 }).success
    ).toBe(true)
  })

  it("defaults to 50 per page", () => {
    expect(DEFAULT_LIMIT).toBe(50)
  })
})

describe("cursor paging", () => {
  it("round-trips an offset", () => {
    for (const n of [0, 1, 50, 999])
      expect(decodeCursor(encodeCursor(n))).toBe(n)
  })

  it("is opaque rather than a bare number", () => {
    expect(encodeCursor(50)).not.toBe("50")
  })

  it("treats absent or malformed cursors as the first page", () => {
    expect(decodeCursor(undefined)).toBe(0)
    expect(decodeCursor("!!!not-base64!!!")).toBe(0)
    expect(decodeCursor(Buffer.from("-5").toString("base64url"))).toBe(0)
  })
})

describe("bearer auth", () => {
  const run = (authorization?: string, token?: string | undefined) => {
    const prev = process.env.MCM_INTEGRATION_TOKEN
    if (token === undefined) delete process.env.MCM_INTEGRATION_TOKEN
    else process.env.MCM_INTEGRATION_TOKEN = token

    const res: any = {
      statusCode: 0,
      body: undefined,
      status(c: number) {
        this.statusCode = c
        return this
      },
      json(b: unknown) {
        this.body = b
        return this
      },
    }
    let nexted = false
    authenticateMcm()(
      { headers: authorization === undefined ? {} : { authorization } } as any,
      res,
      (() => {
        nexted = true
      }) as any
    )
    if (prev === undefined) delete process.env.MCM_INTEGRATION_TOKEN
    else process.env.MCM_INTEGRATION_TOKEN = prev
    return { res, nexted }
  }

  const TOKEN = "a".repeat(64)

  it("accepts the correct token", () => {
    const { nexted, res } = run(`Bearer ${TOKEN}`, TOKEN)
    expect(nexted).toBe(true)
    expect(res.statusCode).toBe(0)
  })

  it("accepts a case-insensitive scheme", () => {
    expect(run(`bearer ${TOKEN}`, TOKEN).nexted).toBe(true)
  })

  it("fails closed when the env var is unset", () => {
    const { nexted, res } = run(`Bearer ${TOKEN}`, undefined)
    expect(nexted).toBe(false)
    expect(res.statusCode).toBe(401)
  })

  it("fails closed when the env var is blank", () => {
    expect(run(`Bearer ${TOKEN}`, "   ").nexted).toBe(false)
  })

  it("returns an identical 401 for missing, malformed and wrong tokens", () => {
    const cases = [
      run(undefined, TOKEN),
      run("", TOKEN),
      run(TOKEN, TOKEN), // no scheme
      run(`Basic ${TOKEN}`, TOKEN), // wrong scheme
      run(`Bearer ${"b".repeat(64)}`, TOKEN), // wrong token
      run("Bearer ", TOKEN), // empty token
      run(`Bearer ${TOKEN}`, undefined), // unset env
    ]
    for (const c of cases) {
      expect(c.nexted).toBe(false)
      expect(c.res.statusCode).toBe(401)
      expect(c.res.body).toEqual(cases[0].res.body)
    }
  })

  it("rejects a token that merely prefixes the real one", () => {
    expect(run(`Bearer ${TOKEN.slice(0, 32)}`, TOKEN).nexted).toBe(false)
  })

  it("does not throw on a length mismatch (digests equalise length)", () => {
    expect(() => run("Bearer short", TOKEN)).not.toThrow()
    expect(run("Bearer short", TOKEN).nexted).toBe(false)
  })
})
