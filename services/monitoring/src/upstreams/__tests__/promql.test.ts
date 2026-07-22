import { describe, it, expect } from "vitest"
import { isMetricKind, METRIC_KINDS, queriesFor } from "../promql"

describe("promql catalog", () => {
  it("exposes exactly the four documented kinds", () => {
    expect([...METRIC_KINDS].sort()).toEqual(["containers", "db", "host", "redis"])
  })

  it("isMetricKind narrows valid kinds", () => {
    expect(isMetricKind("host")).toBe(true)
    expect(isMetricKind("db")).toBe(true)
    expect(isMetricKind("bogus")).toBe(false)
    expect(isMetricKind("")).toBe(false)
  })

  it("every kind maps to at least one named query with required fields", () => {
    for (const kind of METRIC_KINDS) {
      const qs = queriesFor(kind)
      expect(qs.length).toBeGreaterThan(0)
      for (const q of qs) {
        expect(q.key).toBeTruthy()
        expect(q.label).toBeTruthy()
        expect(typeof q.unit).toBe("string")
        expect(q.query).toBeTruthy()
      }
    }
  })

  it("db kind includes pg_up and a connections query", () => {
    const keys = queriesFor("db").map((q) => q.query)
    expect(keys).toContain("pg_up")
    expect(keys.some((q) => q.includes("pg_stat_activity_count"))).toBe(true)
  })

  it("redis kind includes redis_up", () => {
    expect(queriesFor("redis").map((q) => q.query)).toContain("redis_up")
  })
})
