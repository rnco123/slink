import { Injectable } from "@nestjs/common"
import { loadEnv } from "../config/env"
import { getJson, getText } from "../common/http"

export interface PromInstant {
  metric: Record<string, string>
  value: number | null
  raw: string | null
}

export interface PromTarget {
  job: string
  instance: string
  health: string
  lastError: string
}

interface PromQueryResponse {
  status: string
  data: { resultType: string; result: Array<{ metric: Record<string, string>; value: [number, string] }> }
}

interface PromTargetsResponse {
  status: string
  data: { activeTargets: Array<{ labels: Record<string, string>; health: string; lastError: string; scrapeUrl: string }> }
}

@Injectable()
export class PrometheusClient {
  private readonly base = loadEnv().PROMETHEUS_URL
  private readonly timeout = loadEnv().UPSTREAM_TIMEOUT_MS

  async ready(): Promise<boolean> {
    // /-/ready returns plaintext, so read it as text and trust the status code.
    const res = await getText(`${this.base}/-/ready`, { timeoutMs: this.timeout })
    return res.ok
  }

  /** Instant vector query. Returns one row per series. */
  async query(promql: string): Promise<PromInstant[]> {
    const url = `${this.base}/api/v1/query?query=${encodeURIComponent(promql)}`
    const res = await getJson<PromQueryResponse>(url, { timeoutMs: this.timeout })
    if (!res.ok || !res.data || res.data.status !== "success") return []
    return res.data.data.result.map((r) => {
      const rawVal = r.value?.[1] ?? null
      const num = rawVal === null ? null : Number(rawVal)
      return {
        metric: r.metric,
        value: num !== null && Number.isFinite(num) ? num : null,
        raw: rawVal,
      }
    })
  }

  /** Convenience: the scalar value of a single-series query, or null. */
  async scalar(promql: string): Promise<number | null> {
    const rows = await this.query(promql)
    return rows.length > 0 ? rows[0].value : null
  }

  async targets(): Promise<PromTarget[]> {
    const url = `${this.base}/api/v1/targets?state=active`
    const res = await getJson<PromTargetsResponse>(url, { timeoutMs: this.timeout })
    if (!res.ok || !res.data) return []
    return res.data.data.activeTargets.map((t) => ({
      job: t.labels.job ?? "",
      instance: t.labels.instance ?? t.scrapeUrl ?? "",
      health: t.health,
      lastError: t.lastError ?? "",
    }))
  }
}
