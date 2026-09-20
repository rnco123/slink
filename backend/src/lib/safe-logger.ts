/**
 * Safe structured logging for the Medusa backend.
 *
 * WHY THIS EXISTS INSTEAD OF `@saludlink/privacy/logger`
 * -----------------------------------------------------
 * `docs/privacy-boundary.md` rule 4 makes `createSafeLogger` the only sanctioned
 * logger. That package cannot be imported here: it is `"type": "module"` and
 * exports raw `.ts` with extensionless relative imports, while this app compiles
 * with `module: "Node16"` and excludes `node_modules`. Adding it as a dependency
 * makes `medusa build` fail (verified — TS2835 on its internal imports).
 *
 * So this is a deliberate, minimal re-implementation of the SAME contract for
 * the backend only. `SENSITIVE_KEYS` below mirrors `SENSITIVE_REDACT_KEYS` in
 * `packages/privacy/src/prohibited-fields.ts`, and the matching rule is the same
 * (normalize to lowercase alphanumerics, then substring match).
 *
 * KEEP IN SYNC: if that list changes, change this one. The package remains the
 * source of truth; this is a port, not a fork with its own opinions.
 */

/** Severity levels, ordered least → most severe. */
export type LogLevel = "debug" | "info" | "warn" | "error"

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
}

export const REDACTED = "[REDACTED]"

/**
 * Mirrors SENSITIVE_REDACT_KEYS in packages/privacy/src/prohibited-fields.ts.
 * Note `email` and `phone` are here: a buyer's contact details are allowed in an
 * API RESPONSE (they are Identity data) but must never reach a log sink.
 */
const SENSITIVE_KEYS: readonly string[] = [
  "authorization",
  "cookie",
  "setcookie",
  "token",
  "accesstoken",
  "refreshtoken",
  "idtoken",
  "sessiontoken",
  "apikey",
  "secret",
  "clientsecret",
  "webhooksecret",
  "password",
  "passwd",
  "pwd",
  "cardnumber",
  "cvc",
  "cvv",
  "ssn",
  "email",
  "emailaddress",
  "phone",
  "phonenumber",
  "address",
  "address1",
  "address2",
  "streetaddress",
  "requestbody",
  "firstname",
  "lastname",
]

const normalizeKey = (key: string): string =>
  key.toLowerCase().replace(/[^a-z0-9]/g, "")

export function isSensitiveKey(rawKey: string): boolean {
  const key = normalizeKey(rawKey)
  return SENSITIVE_KEYS.some((k) => key === k || key.includes(k))
}

/** Deep-redact a value. Sensitive KEYS are replaced wholesale, at any depth. */
function redact(value: unknown, depth: number): unknown {
  if (depth > 8) return REDACTED
  if (value === null || value === undefined) return value
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1))
  if (value instanceof Error)
    return { name: value.name, message: value.message }
  if (typeof value === "object") {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = isSensitiveKey(k) ? REDACTED : redact(v, depth + 1)
    }
    return out
  }
  return value
}

export interface SafeLogger {
  debug(message: string, context?: Record<string, unknown>): void
  info(message: string, context?: Record<string, unknown>): void
  warn(message: string, context?: Record<string, unknown>): void
  error(message: string, context?: Record<string, unknown>): void
}

/**
 * Build a logger that deep-redacts sensitive keys before anything is emitted.
 * `base` fields are merged into every record (e.g. `{ scope: "mcm-api" }`).
 */
export function createSafeLogger(
  options: { level?: LogLevel; base?: Record<string, unknown> } = {}
): SafeLogger {
  const { level = "info", base = {} } = options
  const threshold = LEVEL_ORDER[level]

  const emit = (
    lvl: LogLevel,
    message: string,
    context?: Record<string, unknown>
  ): void => {
    if (LEVEL_ORDER[lvl] < threshold) return
    const merged = { ...base, ...(context ?? {}) }
    const safe = redact(merged, 0) as Record<string, unknown>
    // Single JSON line — the sink is stdout, scraped by promtail.
    // eslint-disable-next-line no-console
    console[lvl === "debug" ? "log" : lvl](
      JSON.stringify({ level: lvl, message, ...safe })
    )
  }

  return {
    debug: (m, c) => emit("debug", m, c),
    info: (m, c) => emit("info", m, c),
    warn: (m, c) => emit("warn", m, c),
    error: (m, c) => emit("error", m, c),
  }
}
