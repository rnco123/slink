/**
 * Central Time date/time formatting (roadmap task 83).
 *
 * Convention: timestamps are STORED as UTC / ISO-8601 (DST-safe, unambiguous) —
 * Central Time is a DISPLAY concern only. Every user-facing *instant* is rendered
 * in `America/Chicago` so the whole app reads in one timezone regardless of the
 * server's or visitor's locale, and the "CST"/"CDT" label is shown so the zone is
 * explicit. Because `Intl.DateTimeFormat` is given an explicit `timeZone`, output
 * is identical on the server and in the browser (Node ships full ICU).
 *
 * IMPORTANT — instants vs. calendar dates:
 *  - An *instant* (order.created_at, review.created_at, payment.created_at …) is a
 *    point in time → render with formatDate / formatDateTime (shifted to CT).
 *  - A *calendar date* stored as a bare "YYYY-MM-DD" (e.g. a legal page's
 *    "last updated") is a wall-date with no time-of-day → render with
 *    formatCalendarDate, which must NOT be timezone-shifted (shifting "2026-07-22"
 *    into CT would roll it back a day). Never pass a bare date to formatDate.
 */

const CENTRAL_TZ = "America/Chicago"

export type DateInput = string | number | Date | null | undefined

/** Coerce input to a valid Date, or null if absent/unparseable. */
function toValidDate(input: DateInput): Date | null {
  if (input === null || input === undefined || input === "") return null
  const d = input instanceof Date ? input : new Date(input)
  return Number.isNaN(d.getTime()) ? null : d
}

/**
 * An instant as a Central-Time date, e.g. "Jul 22, 2026".
 * Use for order/review/payment timestamps in lists and cards.
 */
export function formatDate(input: DateInput, fallback = ""): string {
  const d = toValidDate(input)
  if (!d) return fallback
  return new Intl.DateTimeFormat("en-US", {
    timeZone: CENTRAL_TZ,
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(d)
}

/**
 * An instant as a Central-Time date + time with an explicit zone label,
 * e.g. "Jul 22, 2026, 3:45 PM CDT". Use for order-confirmation / "paid at".
 */
export function formatDateTime(input: DateInput, fallback = ""): string {
  const d = toValidDate(input)
  if (!d) return fallback
  return new Intl.DateTimeFormat("en-US", {
    timeZone: CENTRAL_TZ,
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short", // -> "CST" / "CDT"
  }).format(d)
}

/**
 * A bare calendar date ("YYYY-MM-DD") as a long, timezone-neutral date, e.g.
 * "July 22, 2026". Parses at UTC noon and formats in UTC so the wall-date is
 * preserved exactly (no CT shift) — for values that carry no time-of-day.
 */
export function formatCalendarDate(
  ymd: string | null | undefined,
  fallback = ""
): string {
  if (!ymd) return fallback
  // Accept a full ISO string too, but only trust its date part.
  const datePart = ymd.slice(0, 10)
  const parsed = new Date(`${datePart}T12:00:00Z`)
  if (Number.isNaN(parsed.getTime())) return fallback || ymd
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(parsed)
}
