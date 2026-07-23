import { Injectable } from "@nestjs/common"
import { loadEnv } from "../config/env"
import { getJson } from "../common/http"

@Injectable()
export class GrafanaClient {
  private readonly env = loadEnv()
  private readonly base = this.env.GRAFANA_URL
  private readonly timeout = this.env.UPSTREAM_TIMEOUT_MS

  async health(): Promise<{
    ok: boolean
    version: string | null
    database: string | null
  }> {
    const res = await getJson<{ database?: string; version?: string }>(
      `${this.base}/api/health`,
      {
        timeoutMs: this.timeout,
      }
    )
    return {
      ok: res.ok,
      version: res.data?.version ?? null,
      database: res.data?.database ?? null,
    }
  }
}
