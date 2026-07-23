import {
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import type { ICacheService } from "@medusajs/framework/types"

/**
 * Redis-backed app-level rate limiting (roadmap task 50).
 *
 * WHY a cache-module fixed-window counter (and not an in-memory Map):
 * the production deploy runs Medusa as separate server + worker processes and
 * can scale to more than one server replica. An in-memory counter would be
 * per-process, so an attacker rotating across replicas would multiply the real
 * limit. Storing the counter in the shared cache module — which is Redis-backed
 * in every non-dev environment (see medusa-config.ts `Modules.CACHE`) — makes
 * the budget correct across ALL server processes hitting the same Redis.
 *
 * Algorithm: fixed window. The key embeds `floor(now / windowSeconds)` so it
 * rolls over automatically and the TTL garbage-collects stale windows. This is
 * a read-modify-write on the cache, so under an extreme concurrent burst two
 * requests can read the same count and both pass — a minor over-count bounded
 * by the concurrency, not a bypass. That trade-off is acceptable for
 * brute-force / abuse mitigation; a stricter atomic INCR would need `ioredis`
 * as a direct dependency of this app (currently only a transitive dep — ask
 * master before adding). See docs/SECURITY-CORS-COOKIES.md.
 *
 * Fail-open: if the cache backend errors we let the request through rather than
 * hard-failing legitimate traffic on an infra hiccup. Rate limiting is a
 * mitigation layer, never the only control.
 */

export type RateLimitOptions = {
  /** Stable bucket id — namespaces the counter (e.g. "auth", "checkout"). */
  id: string
  /** Max requests allowed per IP within the window. */
  limit: number
  /** Window length in seconds. */
  windowSeconds: number
}

/**
 * Best-effort client IP for the rate-limit key.
 *
 * SECURITY (master review, task 50): the deploy sits behind EXACTLY ONE trusted
 * reverse proxy (Caddy), which APPENDS the connecting peer's address to
 * `x-forwarded-for`. So the header looks like `<client-supplied…>, <real peer>`
 * and only the LAST (rightmost) entry is trustworthy — Caddy set it. The
 * leftmost entries are attacker-controlled: if we keyed on them, an attacker
 * could rotate a fake leftmost value every request and evade the limit
 * entirely. We therefore take the rightmost hop.
 *
 * NOTE: this assumes a single trusted proxy. If a CDN / additional proxy is ever
 * put in front of Caddy, the trusted-hop count must be revisited (take the
 * Nth-from-last, or configure Express `trust proxy`). Falls back to `req.ip` /
 * the raw socket when hit directly (dev / no proxy).
 */
function clientIp(req: MedusaRequest): string {
  const xff = req.headers["x-forwarded-for"]
  const raw = Array.isArray(xff) ? xff.join(",") : xff
  if (typeof raw === "string" && raw.length) {
    const parts = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
    const last = parts[parts.length - 1]
    if (last) {
      return last
    }
  }
  return req.ip || req.socket?.remoteAddress || "unknown"
}

/**
 * Read a positive-integer limit from env, falling back to `fallback`. Lets prod
 * tune limits without a code change; a malformed value is ignored.
 */
export function limitFromEnv(envVar: string, fallback: number): number {
  const raw = process.env[envVar]
  if (!raw) {
    return fallback
  }
  const n = Number.parseInt(raw, 10)
  return Number.isInteger(n) && n > 0 ? n : fallback
}

/**
 * Build a Medusa middleware that rate-limits by client IP using the shared
 * cache module. Attach it to a route in `middlewares.ts`.
 */
export function rateLimit(options: RateLimitOptions) {
  const { id, limit, windowSeconds } = options

  return async function rateLimitMiddleware(
    req: MedusaRequest,
    res: MedusaResponse,
    next: MedusaNextFunction
  ): Promise<void> {
    // Test env: the limiter is inert by default so feature integration suites —
    // which legitimately POST many times from a single client IP — aren't
    // self-throttled into flaky 429s (e.g. product-reviews.spec). The dedicated
    // rate-limit suite opts back in per-request with `x-ratelimit-test: 1`. This
    // branch is dead code outside tests (NODE_ENV is never "test" in prod/dev).
    if (
      process.env.NODE_ENV === "test" &&
      req.headers["x-ratelimit-test"] !== "1"
    ) {
      return next()
    }

    try {
      const cache = req.scope.resolve<ICacheService>(Modules.CACHE)
      const nowSeconds = Math.floor(Date.now() / 1000)
      const windowIndex = Math.floor(nowSeconds / windowSeconds)
      const ip = clientIp(req)
      const key = `ratelimit:${id}:${ip}:${windowIndex}`

      const current = (await cache.get<number>(key)) ?? 0
      const resetSeconds = (windowIndex + 1) * windowSeconds - nowSeconds

      res.setHeader("RateLimit-Limit", String(limit))
      res.setHeader("RateLimit-Reset", String(resetSeconds))

      if (current >= limit) {
        res.setHeader("RateLimit-Remaining", "0")
        res.setHeader("Retry-After", String(resetSeconds))
        res.status(429).json({
          type: "too_many_requests",
          message: "Too many requests. Please slow down and try again shortly.",
        })
        return
      }

      // Reserve this request's slot. TTL = window length so the key expires on
      // its own once the window closes.
      await cache.set(key, current + 1, windowSeconds)
      res.setHeader("RateLimit-Remaining", String(limit - current - 1))
    } catch {
      // Fail open — never block legitimate traffic on a limiter/backend error.
    }

    next()
  }
}
