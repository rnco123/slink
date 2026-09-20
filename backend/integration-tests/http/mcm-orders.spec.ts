import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { Modules } from "@medusajs/framework/utils"

jest.setTimeout(5 * 60 * 1000)

/**
 * MCM-Go read API — HTTP suite for `/integrations/mcm/*`.
 *
 * Covers the contract MCM-Go depends on: both one-to-many nestings (a customer
 * has many orders; an order has many line items), the auth paths, paging, and
 * the 404-vs-empty-array distinction.
 *
 * The token is injected via `env` so the guard has something to compare against;
 * the "unset env var" path is asserted by unsetting it for a single request.
 */
const TOKEN = "f".repeat(64)

medusaIntegrationTestRunner({
  inApp: true,
  env: { MCM_INTEGRATION_TOKEN: TOKEN },
  testSuite: ({ api, getContainer }) => {
    const auth = { headers: { authorization: `Bearer ${TOKEN}` } }

    let buyerId: string
    let lonelyId: string
    let orderNos: string[] = []

    /** Seed: one buyer with 3 orders (one of them multi-item, one canceled),
     *  plus a second customer who never bought. */
    beforeAll(async () => {
      const container = getContainer()
      const customerModule: any = container.resolve(Modules.CUSTOMER)
      const orderModule: any = container.resolve(Modules.ORDER)

      const [buyer] = await customerModule.createCustomers([
        {
          email: "buyer@example.com",
          first_name: "Sarah",
          last_name: "Khan",
          phone: "+15125550148",
        },
      ])
      buyerId = buyer.id

      const [lonely] = await customerModule.createCustomers([
        { email: "nobuys@example.com", first_name: "No", last_name: "Orders" },
      ])
      lonelyId = lonely.id

      const base = {
        customer_id: buyerId,
        email: "buyer@example.com",
        currency_code: "usd",
        region_id: undefined as unknown as string,
      }

      const mk = (items: any[], status?: string) => ({
        ...base,
        status,
        items,
        shipping_address: {
          first_name: "Sarah",
          last_name: "Khan",
          address_1: "100 Congress Ave",
          city: "Austin",
          province: "TX",
          postal_code: "78701",
          country_code: "us",
        },
      })

      const one = {
        title: "Tirzepatide 10 mg — 4 week supply",
        quantity: 1,
        unit_price: 299,
        variant_sku: "TIRZ-10MG-4W",
      }
      const two = {
        title: "Sharps disposal container 1 L",
        quantity: 2,
        unit_price: 21,
        variant_sku: "SHARPS-BIN-1L",
      }
      const three = {
        title: "Alcohol swabs",
        quantity: 4,
        unit_price: 5,
        variant_sku: "SWAB-100",
      }
      const four = {
        title: "Needle 31G",
        quantity: 1,
        unit_price: 9,
        variant_sku: "NDL-31G",
      }

      // Oldest → newest so `created_at DESC` has a deterministic order.
      const created = await orderModule.createOrders([
        mk([one]),
        mk([one, two, three, four]), // 4 line items
        mk([one], "canceled"),
      ])
      orderNos = created.map(
        (o: any) => o.custom_display_id?.trim() || `SL-${o.display_id}`
      )
    })

    describe("auth", () => {
      const IDENTICAL = { type: "unauthorized", message: "Unauthorized" }

      it("rejects a missing token", async () => {
        const r = await api
          .post("/integrations/mcm/orders/lookup", { saludlink_code: buyerId })
          .catch((e: any) => e.response)
        expect(r.status).toBe(401)
        expect(r.data).toEqual(IDENTICAL)
      })

      it("rejects a wrong token identically", async () => {
        const r = await api
          .post(
            "/integrations/mcm/orders/lookup",
            { saludlink_code: buyerId },
            { headers: { authorization: `Bearer ${"0".repeat(64)}` } }
          )
          .catch((e: any) => e.response)
        expect(r.status).toBe(401)
        expect(r.data).toEqual(IDENTICAL)
      })

      it("rejects a malformed header identically", async () => {
        for (const authorization of [TOKEN, `Basic ${TOKEN}`, "Bearer "]) {
          const r = await api
            .post(
              "/integrations/mcm/orders/lookup",
              { saludlink_code: buyerId },
              { headers: { authorization } }
            )
            .catch((e: any) => e.response)
          expect(r.status).toBe(401)
          expect(r.data).toEqual(IDENTICAL)
        }
      })

      it("fails closed when MCM_INTEGRATION_TOKEN is unset", async () => {
        const prev = process.env.MCM_INTEGRATION_TOKEN
        delete process.env.MCM_INTEGRATION_TOKEN
        try {
          const r = await api
            .post(
              "/integrations/mcm/orders/lookup",
              { saludlink_code: buyerId },
              auth
            )
            .catch((e: any) => e.response)
          expect(r.status).toBe(401)
          expect(r.data).toEqual(IDENTICAL)
        } finally {
          process.env.MCM_INTEGRATION_TOKEN = prev
        }
      })

      it("guards the GET route too", async () => {
        const r = await api
          .get(`/integrations/mcm/orders/${orderNos[0]}`)
          .catch((e: any) => e.response)
        expect(r.status).toBe(401)
      })
    })

    describe("POST /orders/lookup", () => {
      it("returns all 3 of a customer's orders, newest first, in one array", async () => {
        const r = await api.post(
          "/integrations/mcm/orders/lookup",
          { saludlink_code: buyerId },
          auth
        )
        expect(r.status).toBe(200)
        expect(Array.isArray(r.data.orders)).toBe(true)
        expect(r.data.orders).toHaveLength(3)

        const times = r.data.orders.map((o: any) =>
          new Date(o.created_at).getTime()
        )
        expect([...times]).toEqual([...times].sort((a, b) => b - a))

        for (const o of r.data.orders) {
          expect(o.saludlink_code).toBe(buyerId)
          expect(o.email).toBe("buyer@example.com")
        }
        expect(new Set(r.data.orders.map((o: any) => o.order_no)).size).toBe(3)
      })

      it("returns an order's 4 line items, each with its own quantity and money", async () => {
        const r = await api.post(
          "/integrations/mcm/orders/lookup",
          { saludlink_code: buyerId },
          auth
        )
        const multi = r.data.orders.find((o: any) => o.items.length === 4)
        expect(multi).toBeDefined()
        expect(multi.items).toHaveLength(4)
        for (const i of multi.items) {
          expect(i.line_item_id).toEqual(expect.any(String))
          expect(i.quantity).toEqual(expect.any(Number))
          expect(i.unit_price).toEqual(expect.any(Number))
          expect(i.subtotal).toEqual(expect.any(Number))
        }
        expect(
          multi.items.find((i: any) => i.sku === "SWAB-100").quantity
        ).toBe(4)
      })

      it("reconciles per-item subtotals against the order total", async () => {
        const r = await api.post(
          "/integrations/mcm/orders/lookup",
          { saludlink_code: buyerId },
          auth
        )
        for (const o of r.data.orders) {
          const sum = o.items.reduce((n: number, i: any) => n + i.subtotal, 0)
          expect(sum + o.shipping_total + o.tax_total).toBeCloseTo(o.total, 2)
        }
      })

      it("returns a canceled order with its real status", async () => {
        const r = await api.post(
          "/integrations/mcm/orders/lookup",
          { saludlink_code: buyerId },
          auth
        )
        expect(r.data.orders.map((o: any) => o.status)).toContain("canceled")
      })

      it("returns 200 and an empty array for a known customer with no orders", async () => {
        const r = await api.post(
          "/integrations/mcm/orders/lookup",
          { saludlink_code: lonelyId },
          auth
        )
        expect(r.status).toBe(200)
        expect(r.data.orders).toEqual([])
        expect(r.data.next_cursor).toBeNull()
      })

      it("accepts email as an alternative identifier", async () => {
        const r = await api.post(
          "/integrations/mcm/orders/lookup",
          { email: "buyer@example.com" },
          auth
        )
        expect(r.status).toBe(200)
        expect(r.data.orders).toHaveLength(3)
      })

      it("404s only when the identifier matches nothing at all", async () => {
        const a = await api
          .post(
            "/integrations/mcm/orders/lookup",
            { saludlink_code: "cus_does_not_exist" },
            auth
          )
          .catch((e: any) => e.response)
        expect(a.status).toBe(404)
        const b = await api
          .post(
            "/integrations/mcm/orders/lookup",
            { email: "ghost@example.com" },
            auth
          )
          .catch((e: any) => e.response)
        expect(b.status).toBe(404)
      })

      it("pages with limit/cursor and nulls next_cursor at the end", async () => {
        const p1 = await api.post(
          "/integrations/mcm/orders/lookup",
          { saludlink_code: buyerId, limit: 2 },
          auth
        )
        expect(p1.data.orders).toHaveLength(2)
        expect(p1.data.next_cursor).toEqual(expect.any(String))

        const p2 = await api.post(
          "/integrations/mcm/orders/lookup",
          { saludlink_code: buyerId, limit: 2, cursor: p1.data.next_cursor },
          auth
        )
        expect(p2.data.orders).toHaveLength(1)
        expect(p2.data.next_cursor).toBeNull()

        const seen = [...p1.data.orders, ...p2.data.orders].map(
          (o: any) => o.order_no
        )
        expect(new Set(seen).size).toBe(3)
      })

      it("rejects an unknown key with 400", async () => {
        const r = await api
          .post(
            "/integrations/mcm/orders/lookup",
            { saludlink_code: buyerId, diagnosis: "E66.9" },
            auth
          )
          .catch((e: any) => e.response)
        expect(r.status).toBe(400)
      })

      it("rejects a body with no identifier, and an out-of-range limit", async () => {
        for (const body of [
          {},
          { saludlink_code: "c", limit: 0 },
          { saludlink_code: "c", limit: 101 },
          { email: "nope" },
        ]) {
          const r = await api
            .post("/integrations/mcm/orders/lookup", body, auth)
            .catch((e: any) => e.response)
          expect(r.status).toBe(400)
        }
      })

      it("never returns a forbidden PHI field", async () => {
        const r = await api.post(
          "/integrations/mcm/orders/lookup",
          { saludlink_code: buyerId },
          auth
        )
        const body = JSON.stringify(r.data).toLowerCase()
        for (const bad of [
          "diagnosis",
          '"medication"',
          '"dose"',
          "prescription",
          "encounter_id",
          "provider_id",
          "icd",
          "cpt",
          "ndc",
        ]) {
          expect(body).not.toContain(bad)
        }
      })
    })

    describe("GET /orders/:order_no", () => {
      it("returns one order for a seeded order number", async () => {
        const r = await api.get(`/integrations/mcm/orders/${orderNos[0]}`, auth)
        expect(r.status).toBe(200)
        expect(r.data.orders).toHaveLength(1)
        expect(r.data.orders[0].order_no).toBe(orderNos[0])
        expect(r.data.orders[0].saludlink_code).toBe(buyerId)
        expect(r.data.next_cursor).toBeNull()
      })

      it("accepts the bare display_id form too", async () => {
        const bare = orderNos[0].replace(/^SL-/, "")
        const r = await api.get(`/integrations/mcm/orders/${bare}`, auth)
        expect(r.status).toBe(200)
        expect(r.data.orders[0].order_no).toBe(orderNos[0])
      })

      it("404s for an unknown order number", async () => {
        const r = await api
          .get("/integrations/mcm/orders/SL-99999999", auth)
          .catch((e: any) => e.response)
        expect(r.status).toBe(404)
      })
    })
  },
})
