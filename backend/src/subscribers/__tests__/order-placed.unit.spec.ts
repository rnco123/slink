import orderPlacedHandler from "../order-placed"
import { AUDIT_LOG_MODULE } from "../../modules/audit-log"
import { Modules } from "@medusajs/framework/utils"
import { hashClaimKey } from "../../lib/mcm-claim-key"

/**
 * Claim-key issuance on `order.placed`.
 *
 * The invariants that matter: mint exactly once per order, put the plaintext in
 * the confirmation email and NOWHERE else, and store only the hash.
 */

type OrderShape = {
  id: string
  display_id?: number
  email?: string | null
  currency_code?: string
  metadata?: Record<string, unknown> | null
  items?: { title: string; quantity: number }[]
}

function harness(order: OrderShape) {
  const updates: any[] = []
  const notifications: any[] = []
  const audits: any[] = []

  const orderModule = {
    retrieveOrder: jest.fn().mockResolvedValue(order),
    updateOrders: jest.fn(async (payload: any[]) => {
      updates.push(...payload)
      return payload
    }),
  }
  const notificationModule = {
    createNotifications: jest.fn(async (n: any) => {
      notifications.push(n)
      return n
    }),
  }
  const audit = {
    record: jest.fn(async (a: any) => {
      audits.push(a)
      return a
    }),
  }

  const container = {
    resolve: (key: any) => {
      if (key === Modules.ORDER) return orderModule
      if (key === Modules.NOTIFICATION) return notificationModule
      if (key === AUDIT_LOG_MODULE) return audit
      throw new Error(`unexpected resolve: ${String(key)}`)
    },
  }

  const run = () =>
    orderPlacedHandler({
      event: { data: { id: order.id } },
      container,
    } as any)

  return {
    run,
    updates,
    notifications,
    audits,
    orderModule,
    notificationModule,
  }
}

const BASE: OrderShape = {
  id: "order_01J",
  display_id: 1,
  email: "buyer@example.com",
  currency_code: "usd",
  metadata: null,
  items: [{ title: "NAD+ Injection", quantity: 1 }],
}

describe("claim key issuance", () => {
  it("mints a key, stores only its hash, and emails the plaintext", async () => {
    const h = harness({ ...BASE })
    await h.run()

    expect(h.updates).toHaveLength(1)
    const stored = h.updates[0].metadata
    const sent = h.notifications[0].data.mcm_claim_key

    expect(sent).toMatch(/^[a-zA-Z0-9]{12}$/)
    expect(stored.mcm_key_hash).toBe(hashClaimKey(sent))
    expect(stored.mcm_key_last4).toBe(sent.slice(-4))
  })

  it("never writes the plaintext into metadata", async () => {
    const h = harness({ ...BASE })
    await h.run()
    const sent = h.notifications[0].data.mcm_claim_key
    expect(JSON.stringify(h.updates[0].metadata)).not.toContain(sent)
  })

  it("never writes the plaintext or the hash into the audit trail", async () => {
    const h = harness({ ...BASE })
    await h.run()
    const sent = h.notifications[0].data.mcm_claim_key
    const auditJson = JSON.stringify(h.audits)
    expect(auditJson).not.toContain(sent)
    expect(auditJson).not.toContain(hashClaimKey(sent))
    // It may record THAT a key was issued — just never the key.
    expect(h.audits[0].metadata.mcm_key_issued).toBe(true)
  })

  it("preserves existing metadata such as credits", async () => {
    const h = harness({ ...BASE, metadata: { credits: 5, foo: "bar" } })
    await h.run()
    expect(h.updates[0].metadata).toMatchObject({ credits: 5, foo: "bar" })
    expect(h.updates[0].metadata.mcm_key_hash).toEqual(expect.any(String))
  })
})

describe("mint-once idempotency", () => {
  it("does not mint a second key when one was already issued", async () => {
    const h = harness({
      ...BASE,
      metadata: { mcm_key_hash: "a".repeat(64), mcm_key_last4: "9WKF" },
    })
    await h.run()

    expect(h.orderModule.updateOrders).not.toHaveBeenCalled()
    expect(h.notifications[0].data.mcm_claim_key).toBeNull()
  })

  it("still sends the confirmation email on a replayed event", async () => {
    const h = harness({
      ...BASE,
      metadata: { mcm_key_hash: "a".repeat(64), mcm_key_last4: "9WKF" },
    })
    await h.run()
    expect(h.notifications).toHaveLength(1)
    expect(h.audits[0].metadata.mcm_key_issued).toBe(true)
  })

  it("re-running the subscriber twice yields exactly one mint", async () => {
    const order: OrderShape = { ...BASE }
    const h1 = harness(order)
    await h1.run()
    const first = h1.notifications[0].data.mcm_claim_key

    // Simulate the persisted state the retry would observe.
    const h2 = harness({ ...order, metadata: h1.updates[0].metadata })
    await h2.run()

    expect(h2.orderModule.updateOrders).not.toHaveBeenCalled()
    expect(h2.notifications[0].data.mcm_claim_key).toBeNull()
    expect(hashClaimKey(first)).toBe(h1.updates[0].metadata.mcm_key_hash)
  })
})

describe("orders with no email", () => {
  it("processes without error and issues no key", async () => {
    const h = harness({ ...BASE, email: null })
    await expect(h.run()).resolves.toBeUndefined()
    expect(h.orderModule.updateOrders).not.toHaveBeenCalled()
    expect(h.notifications).toHaveLength(0)
  })

  it("still writes the audit entry, marked as no key issued", async () => {
    const h = harness({ ...BASE, email: null })
    await h.run()
    expect(h.audits).toHaveLength(1)
    expect(h.audits[0].metadata.mcm_key_issued).toBe(false)
  })
})

describe("failure handling", () => {
  it("sends no key when the hash cannot be persisted", async () => {
    const h = harness({ ...BASE })
    h.orderModule.updateOrders.mockRejectedValueOnce(new Error("db down"))
    await expect(h.run()).resolves.toBeUndefined()
    // Better no key than one the buyer holds but we cannot verify.
    expect(h.notifications[0].data.mcm_claim_key).toBeNull()
  })

  it("does not break the order flow when the email provider fails", async () => {
    const h = harness({ ...BASE })
    h.notificationModule.createNotifications.mockRejectedValueOnce(
      new Error("smtp")
    )
    await expect(h.run()).resolves.toBeUndefined()
    expect(h.audits).toHaveLength(1)
  })
})
