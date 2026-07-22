import { describe, it, expect, vi } from "vitest"
import {
  createSafeLogger,
  redact,
  REDACTED,
  REDACTED_PHI,
  type LogRecord,
} from "../safe-logger"

describe("redact", () => {
  it("masks sensitive keys (tokens, email, phone, address, body)", () => {
    const out = redact({
      authorization: "Bearer abc",
      cookie: "session=xyz",
      access_token: "t",
      password: "p",
      email: "a@b.com",
      phone: "+15551234567",
      address_1: "1 Market St",
      body: { anything: 1 },
      order_id: "order_1",
      quantity: 3,
    }) as Record<string, unknown>

    expect(out.authorization).toBe(REDACTED)
    expect(out.cookie).toBe(REDACTED)
    expect(out.access_token).toBe(REDACTED)
    expect(out.password).toBe(REDACTED)
    expect(out.email).toBe(REDACTED)
    expect(out.phone).toBe(REDACTED)
    expect(out.address_1).toBe(REDACTED)
    expect(out.body).toBe(REDACTED)
    // Safe commerce values are preserved.
    expect(out.order_id).toBe("order_1")
    expect(out.quantity).toBe(3)
  })

  it("masks PHI keys with a distinct placeholder and does not recurse into them", () => {
    const out = redact({
      diagnosis: { detail: "should not appear" },
      order_id: "o1",
    }) as Record<string, unknown>
    expect(out.diagnosis).toBe(REDACTED_PHI)
    expect(JSON.stringify(out)).not.toContain("should not appear")
  })

  it("redacts nested structures and arrays", () => {
    const out = redact({
      user: { email: "a@b.com", name: "Alex" },
      items: [{ token: "t", sku: "SKU1" }],
    }) as Record<string, unknown>
    const user = out.user as Record<string, unknown>
    expect(user.email).toBe(REDACTED)
    expect(user.name).toBe("Alex")
    const items = out.items as Array<Record<string, unknown>>
    expect(items[0]?.token).toBe(REDACTED)
    expect(items[0]?.sku).toBe("SKU1")
  })
})

describe("createSafeLogger", () => {
  it("emits redacted context to the sink", () => {
    const records: LogRecord[] = []
    const log = createSafeLogger({
      level: "debug",
      sink: (r) => records.push(r),
      base: { service: "storefront" },
    })
    log.info("checkout.completed", { orderId: "order_1", email: "a@b.com" })

    expect(records).toHaveLength(1)
    const rec = records[0]!
    expect(rec.level).toBe("info")
    expect(rec.message).toBe("checkout.completed")
    expect(rec.context?.service).toBe("storefront")
    expect(rec.context?.orderId).toBe("order_1")
    expect(rec.context?.email).toBe(REDACTED)
  })

  it("respects the minimum level", () => {
    const sink = vi.fn()
    const log = createSafeLogger({ level: "warn", sink })
    log.debug("noise")
    log.info("noise")
    log.warn("kept")
    log.error("kept")
    expect(sink).toHaveBeenCalledTimes(2)
  })

  it("child loggers inherit and extend base context", () => {
    const records: LogRecord[] = []
    const log = createSafeLogger({ sink: (r) => records.push(r), base: { a: 1 } })
    log.child({ b: 2 }).info("m", { c: 3 })
    expect(records[0]?.context).toMatchObject({ a: 1, b: 2, c: 3 })
  })

  it("never lets a raw request body reach the sink", () => {
    const records: LogRecord[] = []
    const log = createSafeLogger({ sink: (r) => records.push(r) })
    log.error("request.failed", {
      requestBody: { email: "a@b.com", diagnosis: "flu" },
    })
    const serialized = JSON.stringify(records)
    expect(serialized).not.toContain("a@b.com")
    expect(serialized).not.toContain("flu")
  })
})
