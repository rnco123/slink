import { Injectable } from "@nestjs/common"
import { loadEnv } from "../config/env"
import { getJson } from "../common/http"

export interface MonitorUptime {
  id: string
  name: string
  up: boolean | null
  uptime24h: number | null
  uptime30d: number | null
}

interface HeartbeatResponse {
  heartbeatList?: Record<string, Array<{ status: number }>>
  uptimeList?: Record<string, number>
}

interface StatusPageResponse {
  publicGroupList?: Array<{ monitorList?: Array<{ id: number; name: string }> }>
}

@Injectable()
export class UptimeKumaClient {
  private readonly env = loadEnv()
  private readonly base = this.env.UPTIME_KUMA_URL
  private readonly timeout = this.env.UPSTREAM_TIMEOUT_MS
  private readonly slug = this.env.UPTIME_KUMA_STATUS_SLUG

  /**
   * Reads the public status-page heartbeat JSON — no auth needed, no full REST
   * CRUD exists (per the API contract). Returns per-monitor up-state + 24h/30d
   * uptime. Returns [] if no status page is configured yet.
   */
  async monitors(): Promise<MonitorUptime[]> {
    const cfg = await getJson<StatusPageResponse>(
      `${this.base}/api/status-page/${encodeURIComponent(this.slug)}`,
      { timeoutMs: this.timeout }
    )
    const hb = await getJson<HeartbeatResponse>(
      `${this.base}/api/status-page/heartbeat/${encodeURIComponent(this.slug)}`,
      { timeoutMs: this.timeout }
    )

    const names = new Map<string, string>()
    if (cfg.ok && cfg.data?.publicGroupList) {
      for (const g of cfg.data.publicGroupList) {
        for (const m of g.monitorList ?? []) names.set(String(m.id), m.name)
      }
    }

    if (!hb.ok || !hb.data) return []
    const uptime = hb.data.uptimeList ?? {}
    const beats = hb.data.heartbeatList ?? {}

    const ids = new Set<string>([...Object.keys(beats), ...names.keys()])
    const out: MonitorUptime[] = []
    for (const id of ids) {
      const list = beats[id]
      const last = list && list.length > 0 ? list[list.length - 1] : undefined
      out.push({
        id,
        name: names.get(id) ?? `monitor ${id}`,
        up: last ? last.status === 1 : null,
        uptime24h: uptime[`${id}_24`] ?? null,
        uptime30d: uptime[`${id}_720`] ?? null,
      })
    }
    return out
  }
}
