import { Injectable } from "@nestjs/common"
import { loadEnv } from "../config/env"

interface Entry<T> {
  value: T
  expiresAt: number
}

/**
 * Tiny in-process TTL cache. Prometheus/Loki queries are relatively expensive
 * and the admin panel polls, so upstream responses are cached for CACHE_TTL_SECONDS
 * (5-30s per the API contract). Single-instance only — that is the deployment
 * shape (one Monitoring API container on the box). No PHI is ever cached; only
 * aggregate, already-redacted summaries pass through here.
 *
 * Uses a monotonic-ish clock via Date only through the injected `now` seam so
 * tests stay deterministic.
 */
@Injectable()
export class CacheService {
  private readonly store = new Map<string, Entry<unknown>>()
  private readonly ttlMs = loadEnv().CACHE_TTL_SECONDS * 1000

  // Clock seam — overridable in tests, but NOT a constructor param so Nest's DI
  // does not try to resolve it as a provider.
  private now: () => number = () => Date.now()

  setClockForTests(fn: () => number): void {
    this.now = fn
  }

  /**
   * Returns the cached value if fresh, otherwise runs `producer`, caches and
   * returns it. A `ttlMsOverride` of 0 disables caching for that key.
   */
  async wrap<T>(key: string, producer: () => Promise<T>, ttlMsOverride?: number): Promise<T> {
    const ttl = ttlMsOverride ?? this.ttlMs
    const hit = this.store.get(key) as Entry<T> | undefined
    const t = this.now()
    if (hit && hit.expiresAt > t) return hit.value
    const value = await producer()
    if (ttl > 0) this.store.set(key, { value, expiresAt: t + ttl })
    return value
  }

  clear(): void {
    this.store.clear()
  }
}
