import { Injectable } from "@nestjs/common"
import { loadEnv } from "../config/env"
import { getJson, getText } from "../common/http"

export interface ActiveAlert {
  name: string
  severity: string
  state: string
  startsAt: string
  summary: string
}

interface AmAlert {
  labels: Record<string, string>
  annotations: Record<string, string>
  status: { state: string }
  startsAt: string
}

@Injectable()
export class AlertmanagerClient {
  private readonly base = loadEnv().ALERTMANAGER_URL
  private readonly timeout = loadEnv().UPSTREAM_TIMEOUT_MS

  async healthy(): Promise<boolean> {
    const res = await getText(`${this.base}/-/healthy`, {
      timeoutMs: this.timeout,
    })
    return res.ok
  }

  async activeAlerts(): Promise<ActiveAlert[]> {
    const res = await getJson<AmAlert[]>(
      `${this.base}/api/v2/alerts?active=true&silenced=false&inhibited=false`,
      {
        timeoutMs: this.timeout,
      }
    )
    if (!res.ok || !res.data) return []
    return res.data.map((a) => ({
      name: a.labels.alertname ?? "unknown",
      severity: a.labels.severity ?? "none",
      state: a.status?.state ?? "unknown",
      startsAt: a.startsAt,
      summary: a.annotations?.summary ?? a.annotations?.description ?? "",
    }))
  }
}
