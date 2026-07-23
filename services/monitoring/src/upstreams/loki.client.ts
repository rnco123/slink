import { Injectable } from "@nestjs/common"
import { loadEnv } from "../config/env"
import { getJson, getText } from "../common/http"
import { redactLine } from "../common/redact"

export interface LogEntry {
  ts: string
  line: string
  labels: Record<string, string>
}

interface LokiQueryRangeResponse {
  status: string
  data: {
    resultType: string
    result: Array<{
      stream: Record<string, string>
      values: Array<[string, string]>
    }>
  }
}

@Injectable()
export class LokiClient {
  private readonly base = loadEnv().LOKI_URL
  private readonly timeout = loadEnv().UPSTREAM_TIMEOUT_MS

  async ready(): Promise<boolean> {
    const res = await getText(`${this.base}/ready`, { timeoutMs: this.timeout })
    return res.ok
  }

  /**
   * Range query. `sinceMs` is a lookback window from now. Every returned line is
   * redacted before it leaves the API. `nowNs` is injectable for tests.
   */
  async queryRange(
    logql: string,
    limit: number,
    sinceMs: number,
    nowNs: bigint = BigInt(Date.now()) * 1_000_000n
  ): Promise<LogEntry[]> {
    const startNs = nowNs - BigInt(sinceMs) * 1_000_000n
    const params = new URLSearchParams({
      query: logql,
      limit: String(limit),
      start: startNs.toString(),
      end: nowNs.toString(),
      direction: "backward",
    })
    const url = `${this.base}/loki/api/v1/query_range?${params.toString()}`
    const res = await getJson<LokiQueryRangeResponse>(url, {
      timeoutMs: this.timeout,
    })
    if (!res.ok || !res.data || res.data.status !== "success") return []

    const out: LogEntry[] = []
    for (const stream of res.data.data.result) {
      for (const [tsNs, line] of stream.values) {
        out.push({ ts: tsNs, line: redactLine(line), labels: stream.stream })
      }
    }
    // Newest first, capped at limit.
    out.sort((a, b) => (a.ts < b.ts ? 1 : a.ts > b.ts ? -1 : 0))
    return out.slice(0, limit)
  }

  async labelValues(name: string): Promise<string[]> {
    const res = await getJson<{ status: string; data: string[] }>(
      `${this.base}/loki/api/v1/label/${encodeURIComponent(name)}/values`,
      { timeoutMs: this.timeout }
    )
    if (!res.ok || !res.data) return []
    return res.data.data ?? []
  }
}
