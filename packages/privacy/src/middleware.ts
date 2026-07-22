/**
 * The request-level PHI firewall.
 *
 * Every mutating request (POST / PUT / PATCH) must flow through this firewall
 * before business logic runs:
 *
 * ```
 * Browser → Zod validation → PHI Firewall → Business logic → DB → Analytics → Logs
 * ```
 *
 * This module is framework-light and ships adapters for both surfaces in the
 * monorepo: Next.js 15 App Router route handlers and Medusa v2 / Express-style
 * middleware. It also guards URLs so PHI can never travel in a query string.
 *
 * On rejection it returns HTTP 400 with a friendly, non-echoing message.
 *
 * @packageDocumentation
 */

import {
  validateNoPhi,
  type ValidateNoPhiOptions,
  type PhiViolation,
} from "./validate-no-phi"
import {
  normalizeKey,
  matchProhibitedKey,
  matchClinicalText,
} from "./prohibited-fields"

/** Methods whose bodies must pass the firewall. */
export const GUARDED_METHODS: ReadonlySet<string> = new Set([
  "POST",
  "PUT",
  "PATCH",
])

/**
 * The friendly, user-facing message returned when a request is rejected for
 * containing medical/clinical information. It deliberately never echoes the
 * rejected value.
 */
export const PHI_REJECTION_MESSAGE =
  "Please do not enter medical or treatment information on this website. Use the secure telemedicine portal for clinical questions."

/**
 * The standard 400 response body shape.
 */
export interface FirewallErrorBody {
  readonly error: "phi_boundary_violation" | "invalid_request"
  readonly message: string
  /** Paths of the offending fields — never their values. Aids debugging safely. */
  readonly fields?: readonly string[]
}

/**
 * The result of evaluating a request body against the firewall.
 */
export type FirewallResult =
  | { readonly ok: true }
  | {
      readonly ok: false
      readonly status: 400
      readonly body: FirewallErrorBody
      readonly violations: readonly PhiViolation[]
    }

/**
 * Evaluate a parsed request body against the PHI firewall.
 *
 * @param body - The already-parsed JSON body (do not pass a raw string).
 * @param options - Free-text scanning configuration (see {@link ValidateNoPhiOptions}).
 * @returns A {@link FirewallResult}.
 */
export function evaluateBody(
  body: unknown,
  options?: ValidateNoPhiOptions
): FirewallResult {
  const result = validateNoPhi(body, options)
  if (result.ok) return { ok: true }
  return {
    ok: false,
    status: 400,
    violations: result.violations,
    body: {
      error: "phi_boundary_violation",
      message: PHI_REJECTION_MESSAGE,
      fields: result.violations.map((v) => v.path),
    },
  }
}

// ---------------------------------------------------------------------------
// Next.js 15 App Router adapter (Web Fetch API: Request → Response).
// ---------------------------------------------------------------------------

/** A Web-standard route handler as used by the Next.js App Router. */
export type RouteHandler = (request: Request) => Promise<Response> | Response

/**
 * Wrap a Next.js App Router route handler so guarded methods have their JSON
 * body checked by the firewall before the handler runs.
 *
 * A malformed JSON body on a guarded method is rejected with 400. Non-guarded
 * methods (GET/DELETE/HEAD) pass straight through.
 *
 * @param handler - The wrapped route handler.
 * @param options - Free-text scanning configuration.
 * @returns A new handler enforcing the firewall.
 *
 * @example
 * ```ts
 * export const POST = withPhiFirewall(async (req) => {
 *   const data = ContactFormSchema.parse(await req.json())
 *   // ... safe to proceed
 *   return Response.json({ ok: true })
 * }, { scanAllText: true })
 * ```
 */
export function withPhiFirewall(
  handler: RouteHandler,
  options?: ValidateNoPhiOptions
): RouteHandler {
  return async (request: Request): Promise<Response> => {
    if (!GUARDED_METHODS.has(request.method.toUpperCase())) {
      return handler(request)
    }

    let body: unknown
    try {
      // Clone so the wrapped handler can still read the body.
      body = await request.clone().json()
    } catch {
      // No body / not JSON → nothing to inspect; let the handler decide.
      return handler(request)
    }

    const verdict = evaluateBody(body, options)
    if (!verdict.ok) {
      return jsonResponse(verdict.status, verdict.body)
    }
    return handler(request)
  }
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  })
}

// ---------------------------------------------------------------------------
// Medusa v2 / Express-style adapter ((req, res, next) => void).
// ---------------------------------------------------------------------------

/** The minimal Express/Medusa request shape the firewall needs. */
export interface ExpressLikeRequest {
  method?: string
  body?: unknown
}

/** The minimal Express/Medusa response shape the firewall needs. */
export interface ExpressLikeResponse {
  status(code: number): { json(body: unknown): unknown }
}

/**
 * Create Medusa v2 / Express-style middleware that runs the firewall on guarded
 * methods before business logic executes. On violation it responds 400 and does
 * not call `next()`.
 *
 * @param options - Free-text scanning configuration.
 * @returns Middleware `(req, res, next) => void`.
 *
 * @example
 * ```ts
 * // medusa-config / middlewares.ts
 * export default defineMiddlewares({
 *   routes: [{ matcher: "/store/*", middlewares: [phiFirewallMiddleware()] }],
 * })
 * ```
 */
export function phiFirewallMiddleware(options?: ValidateNoPhiOptions) {
  return (
    req: ExpressLikeRequest,
    res: ExpressLikeResponse,
    next: (err?: unknown) => void
  ): void => {
    const method = (req.method ?? "GET").toUpperCase()
    if (!GUARDED_METHODS.has(method)) {
      next()
      return
    }
    const verdict = evaluateBody(req.body, options)
    if (!verdict.ok) {
      res.status(verdict.status).json(verdict.body)
      return
    }
    next()
  }
}

// ---------------------------------------------------------------------------
// URL guard — PHI must never appear in a path or query string.
// ---------------------------------------------------------------------------

/** Query/path tokens that indicate PHI is being smuggled through a URL. */
export const PROHIBITED_URL_TOKENS: readonly string[] = [
  "patientid",
  "patient",
  "diagnosis",
  "symptom",
  "symptoms",
  "treatment",
  "medication",
  "prescription",
  "medicalhistory",
  "appointmentreason",
  "encounterid",
  "emrid",
  "providerid",
  "labresult",
  "insurance",
]

/** A URL rejection reason. */
export interface UrlViolation {
  readonly location: "path" | "query-key" | "query-value"
  readonly token: string
}

/**
 * Inspect a URL for PHI in its path or query string.
 *
 * Both query keys and query values are checked: a key like `?diagnosis=` is
 * rejected, and a value that reads as clinical narrative is rejected. Legitimate
 * commerce params (`?q=blood+pressure+monitor`) pass.
 *
 * @param url - An absolute or relative URL string.
 * @returns The list of violations (empty when the URL is safe).
 */
export function inspectUrl(url: string): readonly UrlViolation[] {
  const violations: UrlViolation[] = []
  let parsed: URL
  try {
    parsed = new URL(url, "http://local.invalid")
  } catch {
    return violations
  }

  const normPath = normalizeKey(parsed.pathname)
  for (const token of PROHIBITED_URL_TOKENS) {
    if (normPath.includes(token)) {
      violations.push({ location: "path", token })
    }
  }

  for (const [key, value] of parsed.searchParams.entries()) {
    if (matchProhibitedKey(key)) {
      violations.push({ location: "query-key", token: normalizeKey(key) })
    }
    const clinical = matchClinicalText(value)
    if (clinical) {
      violations.push({ location: "query-value", token: clinical })
    }
  }

  return violations
}

/**
 * Predicate form of {@link inspectUrl}.
 *
 * @param url - The URL to test.
 * @returns `true` when the URL is free of PHI.
 */
export function isUrlSafe(url: string): boolean {
  return inspectUrl(url).length === 0
}

/**
 * Assert a URL carries no PHI, throwing otherwise. Use before issuing redirects
 * or building links to other systems.
 *
 * @param url - The URL to check.
 * @throws {Error} When the URL contains PHI.
 */
export function assertUrlSafe(url: string): void {
  const violations = inspectUrl(url)
  if (violations.length > 0) {
    throw new Error(
      `PHI is not permitted in URLs. Offending ${violations
        .map((v) => v.location)
        .join(", ")}. Use an opaque one-time SSO token instead.`
    )
  }
}
