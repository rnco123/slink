import { Injectable } from "@nestjs/common"
import { loadEnv } from "../config/env"
import { CacheService } from "../common/cache.service"
import { PrometheusClient } from "../upstreams/prometheus.client"
import { AlertmanagerClient } from "../upstreams/alertmanager.client"
import { LokiClient } from "../upstreams/loki.client"
import { UptimeKumaClient } from "../upstreams/uptimekuma.client"
import { BullBoardClient } from "../upstreams/bullboard.client"
import { GrafanaClient } from "../upstreams/grafana.client"
import { MetricKind, queriesFor } from "../upstreams/promql"

export interface HealthRollup {
  status: "ok" | "degraded" | "down"
  generatedAt: string
  targets: { total: number; up: number; down: number; list: Array<{ job: string; health: string }> }
  components: Record<string, { up: boolean; detail?: string }>
}

export interface UptimeRollup {
  status: "ok" | "degraded" | "down"
  probes: Array<{ instance: string; up: boolean; latencyMs: number | null }>
  monitors: Array<{ id: string; name: string; up: boolean | null; uptime24h: number | null; uptime30d: number | null }>
}

export interface MetricSample {
  key: string
  label: string
  unit: string
  value: number | null
  series?: Array<{ labels: Record<string, string>; value: number | null }>
}

export interface GatedResult<T> {
  configured: boolean
  hint?: string
  data: T | null
}

@Injectable()
export class MonitoringService {
  private readonly env = loadEnv()

  constructor(
    private readonly cache: CacheService,
    private readonly prom: PrometheusClient,
    private readonly am: AlertmanagerClient,
    private readonly loki: LokiClient,
    private readonly kuma: UptimeKumaClient,
    private readonly bull: BullBoardClient,
    private readonly grafana: GrafanaClient
  ) {}

  // --- /monitoring/health -----------------------------------------------------
  async health(): Promise<HealthRollup> {
    return this.cache.wrap("health", async () => {
      const [targets, promReady, lokiReady, grafanaHealth, amHealthy] = await Promise.all([
        this.prom.targets(),
        this.prom.ready(),
        this.loki.ready(),
        this.grafana.health(),
        this.am.healthy(),
      ])

      const up = targets.filter((t) => t.health === "up").length
      const down = targets.length - up

      const components: HealthRollup["components"] = {
        prometheus: { up: promReady },
        loki: { up: lokiReady },
        grafana: { up: grafanaHealth.ok, detail: grafanaHealth.version ?? undefined },
        alertmanager: { up: amHealthy },
      }

      const coreUp = Object.values(components).every((c) => c.up)
      const status: HealthRollup["status"] = !coreUp ? "down" : down > 0 ? "degraded" : "ok"

      return {
        status,
        generatedAt: new Date().toISOString(),
        targets: {
          total: targets.length,
          up,
          down,
          list: targets.map((t) => ({ job: t.job, health: t.health })),
        },
        components,
      }
    })
  }

  // --- /monitoring/uptime -----------------------------------------------------
  async uptime(): Promise<UptimeRollup> {
    return this.cache.wrap("uptime", async () => {
      const [probeSuccess, probeDuration, monitors] = await Promise.all([
        this.prom.query("probe_success"),
        this.prom.query('probe_http_duration_seconds{phase="processing"}'),
        this.kuma.monitors(),
      ])

      const durByInstance = new Map<string, number>()
      for (const d of probeDuration) {
        if (d.value !== null) durByInstance.set(d.metric.instance ?? "", d.value)
      }

      const probes = probeSuccess.map((p) => {
        const instance = p.metric.instance ?? ""
        const durS = durByInstance.get(instance)
        return {
          instance,
          up: p.value === 1,
          latencyMs: durS !== undefined ? Math.round(durS * 1000) : null,
        }
      })

      const anyProbeDown = probes.some((p) => !p.up)
      const anyMonitorDown = monitors.some((m) => m.up === false)
      const status: UptimeRollup["status"] =
        probes.length === 0 && monitors.length === 0
          ? "down"
          : anyProbeDown || anyMonitorDown
            ? "degraded"
            : "ok"

      return { status, probes, monitors }
    })
  }

  // --- /monitoring/metrics/:kind ---------------------------------------------
  async metrics(kind: MetricKind): Promise<MetricSample[]> {
    return this.cache.wrap(`metrics:${kind}`, async () => {
      const defs = queriesFor(kind)
      const results = await Promise.all(defs.map((d) => this.prom.query(d.query)))
      return defs.map((d, i) => {
        const rows = results[i]
        // Multi-series (containers, per-db) → expose the series; else a scalar.
        if (rows.length > 1) {
          return {
            key: d.key,
            label: d.label,
            unit: d.unit,
            value: null,
            series: rows.map((r) => ({ labels: r.metric, value: r.value })),
          }
        }
        return {
          key: d.key,
          label: d.label,
          unit: d.unit,
          value: rows.length === 1 ? rows[0].value : null,
        }
      })
    })
  }

  // --- /monitoring/alerts -----------------------------------------------------
  async alerts() {
    return this.cache.wrap("alerts", async () => {
      const list = await this.am.activeAlerts()
      const bySeverity: Record<string, number> = {}
      for (const a of list) bySeverity[a.severity] = (bySeverity[a.severity] ?? 0) + 1
      return { count: list.length, bySeverity, alerts: list }
    })
  }

  // --- /monitoring/logs -------------------------------------------------------
  async logs(opts: { service?: string; query?: string; limit: number; sinceMs: number }) {
    // Not cached — logs are point-in-time and cheap-ish at low limits.
    const selector = opts.service
      ? `{compose_service="${sanitizeLabel(opts.service)}"}`
      : `{compose_project="saludlink"}`
    const filter = opts.query ? ` |= "${sanitizeLineFilter(opts.query)}"` : ""
    const logql = `${selector}${filter}`
    const entries = await this.loki.queryRange(logql, opts.limit, opts.sinceMs)
    return { query: logql, count: entries.length, entries }
  }

  // --- /monitoring/queues -----------------------------------------------------
  async queues() {
    return this.cache.wrap("queues", async () => {
      const list = await this.bull.queues()
      const totalFailed = list.reduce((n, q) => n + q.failed, 0)
      return { count: list.length, totalFailed, queues: list }
    })
  }

  // --- Gated SaaS endpoints (activate only when creds are present) ------------
  security(): GatedResult<never> {
    if (!this.env.GITHUB_TOKEN || !this.env.GITHUB_REPO) {
      return {
        configured: false,
        hint: "Set GITHUB_TOKEN + GITHUB_REPO to surface code-scanning / Dependabot alerts. Pre-launch this stays gated.",
        data: null,
      }
    }
    // Full GitHub code-scanning aggregation lands when the repo is public/GHAS.
    return { configured: false, hint: "GitHub integration wired but not yet enabled.", data: null }
  }

  seo(): GatedResult<never> {
    return {
      configured: false,
      hint: "Search Console + PageSpeed Insights + Lighthouse require a deployed, domain-verified URL and API keys (plan Phase 4/5).",
      data: null,
    }
  }

  analytics(): GatedResult<never> {
    if (!this.env.POSTHOG_PROJECT_API_KEY || !this.env.POSTHOG_PROJECT_ID) {
      return {
        configured: false,
        hint: "Set POSTHOG_PROJECT_API_KEY + POSTHOG_PROJECT_ID for privacy-safe funnel aggregates.",
        data: null,
      }
    }
    return { configured: false, hint: "PostHog integration wired but not yet enabled.", data: null }
  }
}

/** Loki label values are simple identifiers; strip anything that could break the selector. */
function sanitizeLabel(v: string): string {
  return v.replace(/[^A-Za-z0-9_.\-]/g, "").slice(0, 64)
}

/** A line filter is user text; block the quote/backslash that could escape the string. */
function sanitizeLineFilter(v: string): string {
  return v.replace(/["\\]/g, "").slice(0, 128)
}
