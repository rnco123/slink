import { z } from "zod"

/**
 * Boot-time environment validation for the Monitoring API.
 *
 * Matches the repo convention (zod, fail-fast with the offending var). Every
 * upstream base URL is env-driven: dev defaults point at the published
 * 127.0.0.1 dev-host ports (see infra/monitoring/.env), while staging/prod
 * inject the internal `monitoring`-network service names
 * (http://prometheus:9090, http://loki:3100, ...). The API itself holds every
 * upstream credential; the browser never sees them.
 */
const schema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  // The port the API listens on. Bound to BIND_ADDR (127.0.0.1 in dev).
  MONITORING_API_PORT: z.coerce.number().int().positive().default(3009),
  MONITORING_API_BIND: z.string().default("127.0.0.1"),

  // Optional shared-secret gate. When set, every /monitoring/* request must send
  // `Authorization: Bearer <token>` (or `x-api-key`). The admin panel injects it
  // server-side. Empty in local dev = open on loopback only.
  MONITORING_API_TOKEN: z.string().default(""),

  // CORS allow-list for the admin origin(s). Comma-separated. Empty = same-origin
  // / loopback only (no cross-origin allowed).
  MONITORING_CORS_ORIGINS: z.string().default(""),

  // Upstream base URLs (no trailing slash).
  PROMETHEUS_URL: z.string().url().default("http://127.0.0.1:9090"),
  ALERTMANAGER_URL: z.string().url().default("http://127.0.0.1:9093"),
  LOKI_URL: z.string().url().default("http://127.0.0.1:3100"),
  GRAFANA_URL: z.string().url().default("http://127.0.0.1:3001"),
  UPTIME_KUMA_URL: z.string().url().default("http://127.0.0.1:3002"),
  BULL_BOARD_URL: z.string().url().default("http://127.0.0.1:3003"),

  // Upstream credentials (server-side only).
  GRAFANA_SA_TOKEN: z.string().default(""),
  UPTIME_KUMA_API_KEY: z.string().default(""),
  UPTIME_KUMA_STATUS_SLUG: z.string().default("saludlink"),
  BULL_BOARD_USER: z.string().default("admin"),
  BULL_BOARD_PASSWORD: z.string().default(""),

  // SaaS integrations — gated. Present = the endpoint activates; absent = the
  // endpoint returns a `configured:false` stub (no external calls pre-launch).
  GITHUB_TOKEN: z.string().default(""),
  GITHUB_REPO: z.string().default(""), // e.g. "rnco123/slink"
  POSTHOG_PROJECT_API_KEY: z.string().default(""),
  POSTHOG_PROJECT_ID: z.string().default(""),
  POSTHOG_HOST: z.string().default("https://us.posthog.com"),

  // Upstream request timeout (ms) and cache TTL (seconds).
  UPSTREAM_TIMEOUT_MS: z.coerce.number().int().positive().default(5000),
  CACHE_TTL_SECONDS: z.coerce.number().int().nonnegative().default(10),
})

export type AppEnv = z.infer<typeof schema>

let cached: AppEnv | null = null

export function loadEnv(source: NodeJS.ProcessEnv = process.env): AppEnv {
  if (cached) return cached
  const parsed = schema.safeParse(source)
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n")
    // Fail fast, naming the offending var(s).
    throw new Error(
      `[monitoring-api] Invalid environment configuration:\n${issues}`
    )
  }
  cached = parsed.data
  return cached
}

/** Test helper — clears the memoized env so a fresh source can be loaded. */
export function resetEnvForTests(): void {
  cached = null
}
