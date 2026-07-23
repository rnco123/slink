import { describe, it, expect, beforeEach } from "vitest"
import { MonitoringService } from "../monitoring.service"
import type {
  PrometheusClient,
  PromInstant,
  PromTarget,
} from "../../upstreams/prometheus.client"
import type { AlertmanagerClient } from "../../upstreams/alertmanager.client"
import type { LokiClient } from "../../upstreams/loki.client"
import type { UptimeKumaClient } from "../../upstreams/uptimekuma.client"
import type { BullBoardClient } from "../../upstreams/bullboard.client"
import type { GrafanaClient } from "../../upstreams/grafana.client"
import type { CacheService } from "../../common/cache.service"

// Passthrough cache — no memoization, so each test sees fresh producer output.
const passthroughCache = {
  wrap: <T>(_k: string, producer: () => Promise<T>) => producer(),
  clear: () => {},
} as unknown as CacheService

function instant(metric: Record<string, string>, value: number): PromInstant {
  return { metric, value, raw: String(value) }
}

function makeService(over: {
  targets?: PromTarget[]
  ready?: boolean
  query?: (q: string) => PromInstant[]
  grafanaOk?: boolean
  amHealthy?: boolean
  alerts?: Awaited<ReturnType<AlertmanagerClient["activeAlerts"]>>
  monitors?: Awaited<ReturnType<UptimeKumaClient["monitors"]>>
  queues?: Awaited<ReturnType<BullBoardClient["queues"]>>
}): MonitoringService {
  const prom = {
    targets: async () => over.targets ?? [],
    ready: async () => over.ready ?? true,
    query: async (q: string) => (over.query ? over.query(q) : []),
    scalar: async () => null,
  } as unknown as PrometheusClient
  const am = {
    healthy: async () => over.amHealthy ?? true,
    activeAlerts: async () => over.alerts ?? [],
  } as unknown as AlertmanagerClient
  const loki = {
    ready: async () => over.ready ?? true,
  } as unknown as LokiClient
  const kuma = {
    monitors: async () => over.monitors ?? [],
  } as unknown as UptimeKumaClient
  const bull = {
    queues: async () => over.queues ?? [],
  } as unknown as BullBoardClient
  const grafana = {
    health: async () => ({
      ok: over.grafanaOk ?? true,
      version: "11.3.1",
      database: "ok",
    }),
  } as unknown as GrafanaClient
  return new MonitoringService(
    passthroughCache,
    prom,
    am,
    loki,
    kuma,
    bull,
    grafana
  )
}

describe("MonitoringService.health", () => {
  it("reports ok when core components up and all targets up", async () => {
    const svc = makeService({
      targets: [
        { job: "node", instance: "n", health: "up", lastError: "" },
        { job: "redis", instance: "r", health: "up", lastError: "" },
      ],
    })
    const h = await svc.health()
    expect(h.status).toBe("ok")
    expect(h.targets.total).toBe(2)
    expect(h.targets.up).toBe(2)
    expect(h.components.prometheus.up).toBe(true)
  })

  it("reports degraded when a target is down but core is up", async () => {
    const svc = makeService({
      targets: [
        { job: "node", instance: "n", health: "up", lastError: "" },
        {
          job: "postgres",
          instance: "p",
          health: "down",
          lastError: "conn refused",
        },
      ],
    })
    const h = await svc.health()
    expect(h.status).toBe("degraded")
    expect(h.targets.down).toBe(1)
  })

  it("reports down when a core component is down", async () => {
    const svc = makeService({ targets: [], grafanaOk: false })
    const h = await svc.health()
    expect(h.status).toBe("down")
    expect(h.components.grafana.up).toBe(false)
  })
})

describe("MonitoringService.uptime", () => {
  it("joins probe_success with latency and flags degraded on a down probe", async () => {
    const svc = makeService({
      query: (q) => {
        if (q === "probe_success")
          return [
            instant({ instance: "http://a" }, 1),
            instant({ instance: "http://b" }, 0),
          ]
        if (q.startsWith("probe_http_duration_seconds"))
          return [instant({ instance: "http://a" }, 0.123)]
        return []
      },
    })
    const u = await svc.uptime()
    expect(u.status).toBe("degraded")
    const a = u.probes.find((p) => p.instance === "http://a")
    expect(a?.up).toBe(true)
    expect(a?.latencyMs).toBe(123)
    expect(u.probes.find((p) => p.instance === "http://b")?.up).toBe(false)
  })
})

describe("MonitoringService.metrics", () => {
  it("returns a scalar for single-series and series[] for multi-series", async () => {
    const svc = makeService({
      query: (q) => {
        if (q === "pg_up") return [instant({}, 1)]
        if (q.includes("pg_stat_activity_count")) return [instant({}, 7)]
        return [] // rate queries → no data in this stub
      },
    })
    const m = await svc.metrics("db")
    const up = m.find((x) => x.key === "up")
    expect(up?.value).toBe(1)
    const conns = m.find((x) => x.key === "connections")
    expect(conns?.value).toBe(7)
  })

  it("exposes per-series for container metrics", async () => {
    const svc = makeService({
      query: () => [
        instant({ name: "medusa" }, 0.2),
        instant({ name: "storefront" }, 0.1),
      ],
    })
    const m = await svc.metrics("containers")
    const cpu = m.find((x) => x.key === "cpu_per_s")
    expect(cpu?.series?.length).toBe(2)
    expect(cpu?.value).toBeNull()
  })
})

describe("MonitoringService.alerts / queues", () => {
  it("summarizes alerts by severity", async () => {
    const svc = makeService({
      alerts: [
        {
          name: "A",
          severity: "critical",
          state: "active",
          startsAt: "",
          summary: "",
        },
        {
          name: "B",
          severity: "warning",
          state: "active",
          startsAt: "",
          summary: "",
        },
        {
          name: "C",
          severity: "critical",
          state: "active",
          startsAt: "",
          summary: "",
        },
      ],
    })
    const a = await svc.alerts()
    expect(a.count).toBe(3)
    expect(a.bySeverity.critical).toBe(2)
    expect(a.bySeverity.warning).toBe(1)
  })

  it("totals failed jobs across queues", async () => {
    const svc = makeService({
      queues: [
        {
          name: "event-bus",
          waiting: 0,
          active: 1,
          completed: 5,
          failed: 2,
          delayed: 0,
          paused: 0,
        },
        {
          name: "workflows",
          waiting: 3,
          active: 0,
          completed: 9,
          failed: 1,
          delayed: 0,
          paused: 0,
        },
      ],
    })
    const q = await svc.queues()
    expect(q.count).toBe(2)
    expect(q.totalFailed).toBe(3)
  })
})

describe("MonitoringService gated endpoints", () => {
  let svc: MonitoringService
  beforeEach(() => {
    svc = makeService({})
  })
  it("security is gated without a GitHub token", () => {
    expect(svc.security().configured).toBe(false)
  })
  it("seo is gated pre-launch", () => {
    expect(svc.seo().configured).toBe(false)
  })
  it("analytics is gated without PostHog creds", () => {
    expect(svc.analytics().configured).toBe(false)
  })
})
