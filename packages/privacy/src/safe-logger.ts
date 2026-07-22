/**
 * Safe structured logging.
 *
 * The only sanctioned logger for the commerce app. It deep-redacts sensitive and
 * PHI-bearing values before anything is emitted, so Authorization headers,
 * cookies, tokens, Stripe secrets, emails, phone numbers, addresses, raw request
 * bodies, and any clinical text can never land in a log sink.
 *
 * Feature code must not call `console.*` directly for anything that could carry
 * user data (enforced by ESLint) — use a logger from {@link createSafeLogger}.
 *
 * @packageDocumentation
 */

import { isSensitiveKey, matchProhibitedKey } from "./prohibited-fields"

/** Standard severity levels, ordered least → most severe. */
export type LogLevel = "debug" | "info" | "warn" | "error"

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
}

/** The redaction placeholder written in place of sensitive values. */
export const REDACTED = "[REDACTED]"

/** The placeholder written in place of a PHI value that must never be stored. */
export const REDACTED_PHI = "[REDACTED_PHI]"

/**
 * A structured log record after redaction. Always safe to serialize and ship.
 */
export interface LogRecord {
  readonly level: LogLevel
  readonly message: string
  readonly context?: Record<string, unknown>
}

/** A sink that receives already-redacted records. Defaults to `console`. */
export type LogSink = (record: LogRecord) => void

/**
 * Options for {@link createSafeLogger}.
 */
export interface SafeLoggerOptions {
  /** Minimum level to emit. @defaultValue `"info"` */
  readonly level?: LogLevel
  /** Where redacted records go. @defaultValue a JSON `console` sink */
  readonly sink?: LogSink
  /** Static fields merged into every record's context (e.g. `service`). */
  readonly base?: Record<string, unknown>
  /** Maximum recursion depth when redacting nested context. @defaultValue `8` */
  readonly maxDepth?: number
}

/**
 * Deep-redact an arbitrary value for safe logging.
 *
 * - Values under sensitive keys (tokens, email, phone, address, body, …) become
 *   {@link REDACTED}.
 * - Values under PHI keys become {@link REDACTED_PHI} and are never recursed into.
 * - Everything else is preserved (numbers, booleans, safe strings).
 *
 * @param value - The value to redact.
 * @param maxDepth - Recursion guard.
 * @returns A structurally-similar value with sensitive/PHI fields masked.
 */
export function redact(value: unknown, maxDepth = 8): unknown {
  const walk = (node: unknown, depth: number): unknown => {
    if (node === null || node === undefined) return node
    if (depth > maxDepth) return REDACTED
    if (typeof node !== "object") return node

    if (Array.isArray(node)) {
      return node.map((item) => walk(item, depth + 1))
    }

    const out: Record<string, unknown> = {}
    for (const [key, child] of Object.entries(node as Record<string, unknown>)) {
      if (matchProhibitedKey(key)) {
        out[key] = REDACTED_PHI
        continue
      }
      if (isSensitiveKey(key)) {
        out[key] = REDACTED
        continue
      }
      out[key] = walk(child, depth + 1)
    }
    return out
  }
  return walk(value, 0)
}

const defaultSink: LogSink = (record) => {
  // Single-line JSON; safe because `record` is already redacted.
  const line = JSON.stringify(record)
  if (record.level === "error") console.error(line)
  else if (record.level === "warn") console.warn(line)
  else console.log(line)
}

/**
 * A structured logger whose methods redact their context before emitting.
 */
export interface SafeLogger {
  debug(message: string, context?: Record<string, unknown>): void
  info(message: string, context?: Record<string, unknown>): void
  warn(message: string, context?: Record<string, unknown>): void
  error(message: string, context?: Record<string, unknown>): void
  /** Derive a child logger with additional static base fields. */
  child(base: Record<string, unknown>): SafeLogger
}

/**
 * Create a {@link SafeLogger}.
 *
 * @param options - See {@link SafeLoggerOptions}.
 * @returns A redacting structured logger.
 *
 * @example
 * ```ts
 * const log = createSafeLogger({ base: { service: "storefront" } })
 * log.info("checkout.completed", { orderId: "order_123", email: "a@b.com" })
 * // → email is redacted; orderId is preserved
 * ```
 */
export function createSafeLogger(options: SafeLoggerOptions = {}): SafeLogger {
  const {
    level = "info",
    sink = defaultSink,
    base = {},
    maxDepth = 8,
  } = options
  const threshold = LEVEL_ORDER[level]

  const emit = (
    lvl: LogLevel,
    message: string,
    context?: Record<string, unknown>
  ): void => {
    if (LEVEL_ORDER[lvl] < threshold) return
    const merged =
      context || Object.keys(base).length
        ? { ...base, ...(context ?? {}) }
        : undefined
    const safeContext =
      merged === undefined
        ? undefined
        : (redact(merged, maxDepth) as Record<string, unknown>)
    sink({ level: lvl, message, ...(safeContext ? { context: safeContext } : {}) })
  }

  return {
    debug: (m, c) => emit("debug", m, c),
    info: (m, c) => emit("info", m, c),
    warn: (m, c) => emit("warn", m, c),
    error: (m, c) => emit("error", m, c),
    child: (childBase) =>
      createSafeLogger({ level, sink, maxDepth, base: { ...base, ...childBase } }),
  }
}

/**
 * A process-wide default logger. Prefer `createSafeLogger` with a `service` base
 * in each app, but this is available for quick use.
 */
export const safeLogger: SafeLogger = createSafeLogger()
