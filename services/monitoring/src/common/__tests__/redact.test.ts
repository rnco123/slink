import { describe, it, expect } from "vitest"
import { redactLine, redactLines } from "../redact"

describe("redactLine", () => {
  it("redacts emails (PHI identifier)", () => {
    expect(redactLine("user patient@example.com placed order")).toBe(
      "user [REDACTED_EMAIL] placed order"
    )
  })

  it("redacts bearer tokens", () => {
    expect(redactLine("auth Bearer abc.DEF-123 done")).toBe("auth Bearer [REDACTED_TOKEN] done")
  })

  it("redacts known secret prefixes", () => {
    expect(redactLine("key=sk_live_abc123DEF")).toContain("[REDACTED_SECRET]")
    expect(redactLine("token glsa_xyz789")).toContain("[REDACTED_SECRET]")
    expect(redactLine("pat github_pat_11ABCdef")).toContain("[REDACTED_SECRET]")
  })

  it("redacts key=value secrets", () => {
    const out = redactLine('password=hunter2 and api_key: superSecret')
    expect(out).not.toContain("hunter2")
    expect(out).not.toContain("superSecret")
    expect(out).toContain("[REDACTED]")
  })

  it("redacts JWTs", () => {
    const jwt = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.abc-DEF_123"
    expect(redactLine(`token ${jwt}`)).toBe("token [REDACTED_JWT]")
  })

  it("redacts phone numbers", () => {
    expect(redactLine("call +1 415-555-1234 now")).toContain("[REDACTED_PHONE]")
  })

  it("redacts card-like numbers", () => {
    expect(redactLine("card 4111 1111 1111 1111")).toContain("[REDACTED_PAN]")
  })

  it("leaves clean ops lines untouched", () => {
    const line = "level=info msg=scrape target=node-exporter:9100 duration=12ms"
    expect(redactLine(line)).toBe(line)
  })

  it("handles empty input", () => {
    expect(redactLine("")).toBe("")
  })

  it("redactLines maps over an array", () => {
    expect(redactLines(["a@b.com", "clean"])).toEqual(["[REDACTED_EMAIL]", "clean"])
  })
})
