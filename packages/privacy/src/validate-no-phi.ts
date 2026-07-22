/**
 * The core PHI detector.
 *
 * {@link validateNoPhi} recursively walks an arbitrary JSON-like value and
 * reports every field that looks like Protected Health Information. It inspects
 * object *keys* structurally, and optionally scans designated free-text *values*
 * for clinical narratives.
 *
 * Crucially, violations never carry the offending value — only its path and the
 * matched keyword — so callers can safely log, return, or throw them without
 * echoing PHI back to the client or into logs.
 *
 * @packageDocumentation
 */

import {
  matchProhibitedKey,
  matchClinicalText,
  normalizeKey,
} from "./prohibited-fields"

/**
 * A single PHI violation. Contains no field value — safe to surface anywhere.
 */
export interface PhiViolation {
  /** Dotted path to the offending field (array indices included), e.g. `items.0.diagnosis`. */
  readonly path: string
  /** Why it was flagged. */
  readonly reason:
    | "prohibited-key"
    | "clinical-free-text"
  /** The normalized keyword or pattern that triggered the match. Never a value. */
  readonly keyword: string
}

/**
 * Options controlling {@link validateNoPhi}.
 */
export interface ValidateNoPhiOptions {
  /**
   * Field paths (dotted, matched case-insensitively against the normalized path)
   * whose string values should additionally be scanned for clinical narratives.
   * Product search queries must NOT be listed here.
   *
   * @defaultValue `[]`
   */
  readonly scanTextPaths?: readonly string[]
  /**
   * When `true`, scan *every* string value for clinical narratives, not just the
   * paths in {@link ValidateNoPhiOptions.scanTextPaths}. Use for high-risk free
   * form endpoints (contact/support). Never enable for search.
   *
   * @defaultValue `false`
   */
  readonly scanAllText?: boolean
  /**
   * Maximum recursion depth, a guard against pathological/circular payloads.
   *
   * @defaultValue `12`
   */
  readonly maxDepth?: number
}

/**
 * The result of a PHI scan.
 */
export interface ValidateNoPhiResult {
  /** `true` when no PHI was detected. */
  readonly ok: boolean
  /** Every violation found (empty when `ok`). Never contains field values. */
  readonly violations: readonly PhiViolation[]
}

const DEFAULT_MAX_DEPTH = 12

function joinPath(base: string, key: string | number): string {
  return base ? `${base}.${key}` : String(key)
}

/**
 * Recursively scan a value for PHI.
 *
 * @param value - Any JSON-like value (object, array, or primitive).
 * @param options - See {@link ValidateNoPhiOptions}.
 * @returns A {@link ValidateNoPhiResult} listing all violations.
 *
 * @example
 * ```ts
 * const r = validateNoPhi({ email: "a@b.com", visit: { diagnosis: "flu" } })
 * r.ok // false
 * r.violations[0].path // "visit.diagnosis"
 * ```
 */
export function validateNoPhi(
  value: unknown,
  options: ValidateNoPhiOptions = {}
): ValidateNoPhiResult {
  const maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH
  const scanPaths = new Set(
    (options.scanTextPaths ?? []).map((p) => normalizeKey(p))
  )
  const violations: PhiViolation[] = []
  const seen = new WeakSet<object>()

  const shouldScanText = (path: string): boolean => {
    if (options.scanAllText) return true
    if (scanPaths.size === 0) return false
    const norm = normalizeKey(path)
    // Match the full normalized path or its trailing segment.
    if (scanPaths.has(norm)) return true
    const lastSeg = path.split(".").pop() ?? ""
    return scanPaths.has(normalizeKey(lastSeg))
  }

  const walk = (node: unknown, path: string, depth: number): void => {
    if (node === null || node === undefined) return
    if (depth > maxDepth) return

    if (typeof node === "string") {
      if (shouldScanText(path)) {
        const hit = matchClinicalText(node)
        if (hit) {
          violations.push({
            path: path || "(root)",
            reason: "clinical-free-text",
            keyword: hit,
          })
        }
      }
      return
    }

    if (typeof node !== "object") return

    if (seen.has(node as object)) return
    seen.add(node as object)

    if (Array.isArray(node)) {
      node.forEach((item, i) => walk(item, joinPath(path, i), depth + 1))
      return
    }

    for (const [key, child] of Object.entries(node as Record<string, unknown>)) {
      const childPath = joinPath(path, key)
      const keyMatch = matchProhibitedKey(key)
      if (keyMatch) {
        violations.push({
          path: childPath,
          reason: "prohibited-key",
          keyword: keyMatch.keyword,
        })
        // Do not recurse into a prohibited subtree; the whole branch is tainted
        // and we must not risk copying any of its values anywhere.
        continue
      }
      walk(child, childPath, depth + 1)
    }
  }

  walk(value, "", 0)
  return { ok: violations.length === 0, violations }
}

/**
 * Error thrown when PHI is detected. Its `violations` never contain field values.
 */
export class PhiDetectedError extends Error {
  /** The violations that caused the rejection. */
  public readonly violations: readonly PhiViolation[]

  constructor(violations: readonly PhiViolation[]) {
    super(
      `PHI detected in ${violations.length} field(s): ${violations
        .map((v) => v.path)
        .join(", ")}`
    )
    this.name = "PhiDetectedError"
    this.violations = violations
  }
}

/**
 * Assert that a value contains no PHI, throwing {@link PhiDetectedError} otherwise.
 *
 * @param value - The value to check.
 * @param options - See {@link ValidateNoPhiOptions}.
 * @throws {PhiDetectedError} When any PHI is detected.
 */
export function assertNoPhi(
  value: unknown,
  options?: ValidateNoPhiOptions
): void {
  const result = validateNoPhi(value, options)
  if (!result.ok) {
    throw new PhiDetectedError(result.violations)
  }
}

/**
 * Convenience predicate.
 *
 * @param value - The value to check.
 * @param options - See {@link ValidateNoPhiOptions}.
 * @returns `true` when the value is free of PHI.
 */
export function isPhiFree(
  value: unknown,
  options?: ValidateNoPhiOptions
): boolean {
  return validateNoPhi(value, options).ok
}
