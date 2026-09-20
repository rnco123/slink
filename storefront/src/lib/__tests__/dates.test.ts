import { describe, it, expect } from "vitest"
import { formatDate, formatDateTime, formatCalendarDate } from "@lib/util/dates"

/**
 * Task 83 — Central Time everywhere. These lock in that instants are rendered in
 * America/Chicago (not the server/UTC timezone) and that bare calendar dates are
 * NOT timezone-shifted. Uses instants that cross a day boundary so a missing CT
 * shift would visibly change the date.
 */
describe("formatDate (instant → Central Time)", () => {
  it("shifts a UTC instant back into CT, rolling the day when appropriate", () => {
    // 2026-07-22T04:00Z is 2026-07-21 23:00 in Central (CDT, UTC-5).
    expect(formatDate("2026-07-22T04:00:00Z")).toBe("Jul 21, 2026")
  })

  it("renders a midday UTC instant on the same CT day", () => {
    // 2026-07-22T18:00Z is 2026-07-22 13:00 CDT.
    expect(formatDate("2026-07-22T18:00:00Z")).toBe("Jul 22, 2026")
  })

  it("handles a winter (CST) instant", () => {
    // 2026-01-15T05:30Z is 2026-01-14 23:30 in Central (CST, UTC-6).
    expect(formatDate("2026-01-15T05:30:00Z")).toBe("Jan 14, 2026")
  })

  it("accepts Date and epoch-ms inputs", () => {
    const iso = "2026-07-22T18:00:00Z"
    expect(formatDate(new Date(iso))).toBe("Jul 22, 2026")
    expect(formatDate(Date.parse(iso))).toBe("Jul 22, 2026")
  })

  it("returns the fallback for missing/invalid input", () => {
    expect(formatDate(null)).toBe("")
    expect(formatDate(undefined)).toBe("")
    expect(formatDate("")).toBe("")
    expect(formatDate("not-a-date")).toBe("")
    expect(formatDate(null, "—")).toBe("—")
  })
})

describe("formatDateTime (instant → CT with zone label)", () => {
  it("renders the CT time and a CDT label in summer", () => {
    const out = formatDateTime("2026-07-22T04:00:00Z")
    expect(out).toContain("Jul 21, 2026")
    expect(out).toContain("11:00")
    expect(out).toContain("PM")
    expect(out).toContain("CDT")
  })

  it("renders a CST label in winter", () => {
    const out = formatDateTime("2026-01-15T05:30:00Z")
    expect(out).toContain("Jan 14, 2026")
    expect(out).toContain("11:30")
    expect(out).toContain("PM")
    expect(out).toContain("CST")
  })

  it("returns the fallback for missing/invalid input", () => {
    expect(formatDateTime(null)).toBe("")
    expect(formatDateTime("nope", "—")).toBe("—")
  })
})

describe("formatCalendarDate (wall-date, no TZ shift)", () => {
  it("formats a bare YYYY-MM-DD without shifting the day", () => {
    expect(formatCalendarDate("2026-07-22")).toBe("July 22, 2026")
    expect(formatCalendarDate("2026-01-01")).toBe("January 1, 2026")
  })

  it("uses only the date part of a full ISO string", () => {
    // Late-evening UTC that would roll back a day if treated as a CT instant.
    expect(formatCalendarDate("2026-07-22T23:00:00Z")).toBe("July 22, 2026")
  })

  it("returns the fallback for missing/invalid input", () => {
    expect(formatCalendarDate(null)).toBe("")
    expect(formatCalendarDate(undefined, "—")).toBe("—")
  })
})
