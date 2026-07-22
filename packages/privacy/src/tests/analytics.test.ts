import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import {
  captureSafeEvent,
  registerAnalyticsTransport,
  isApprovedEvent,
  ANALYTICS_EVENTS,
} from "../analytics"

describe("captureSafeEvent", () => {
  const transport = vi.fn()

  beforeEach(() => {
    transport.mockReset()
    registerAnalyticsTransport(transport)
  })
  afterEach(() => registerAnalyticsTransport(null))

  it("forwards a valid approved event to the transport", () => {
    const res = captureSafeEvent("order_completed", {
      order_id: "order_1",
      value: 34,
      currency_code: "usd",
      item_count: 1,
    })
    expect(res.ok).toBe(true)
    expect(transport).toHaveBeenCalledTimes(1)
    expect(transport).toHaveBeenCalledWith("order_completed", {
      order_id: "order_1",
      value: 34,
      currency_code: "usd",
      item_count: 1,
    })
  })

  it("rejects an unknown event", () => {
    // @ts-expect-error — deliberately unapproved event name
    const res = captureSafeEvent("leak_everything", { email: "a@b.com" })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.reason).toBe("unknown-event")
    expect(transport).not.toHaveBeenCalled()
  })

  it("rejects extra/unknown fields (strict payload)", () => {
    const res = captureSafeEvent("product_viewed", {
      product_id: "p1",
      // @ts-expect-error — email is not part of the schema
      email: "a@b.com",
    })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.reason).toBe("invalid-payload")
    expect(transport).not.toHaveBeenCalled()
  })

  it("never forwards when the transport is disabled", () => {
    registerAnalyticsTransport(null)
    const res = captureSafeEvent("page_viewed", { path: "/en" })
    expect(res.ok).toBe(true)
    expect(transport).not.toHaveBeenCalled()
  })

  it("search event carries no raw query string", () => {
    const schema = ANALYTICS_EVENTS.search_performed
    // Raw query text is not an accepted field.
    expect(
      schema.safeParse({ query: "my diagnosis", results_count: 0 }).success
    ).toBe(false)
    expect(
      schema.safeParse({ query_length: 12, results_count: 3 }).success
    ).toBe(true)
  })
})

describe("isApprovedEvent", () => {
  it("recognises approved events", () => {
    expect(isApprovedEvent("order_completed")).toBe(true)
    expect(isApprovedEvent("definitely_not_an_event")).toBe(false)
  })
})
