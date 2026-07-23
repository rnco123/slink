import { Injectable } from "@nestjs/common"
import { loadEnv } from "../config/env"
import { getJson } from "../common/http"

export interface QueueCounts {
  name: string
  waiting: number
  active: number
  completed: number
  failed: number
  delayed: number
  paused: number
}

interface BullBoardResponse {
  queues?: Array<{
    name: string
    counts?: Partial<Record<string, number>>
  }>
}

@Injectable()
export class BullBoardClient {
  private readonly env = loadEnv()
  private readonly base = this.env.BULL_BOARD_URL
  private readonly timeout = this.env.UPSTREAM_TIMEOUT_MS

  /**
   * Reads BullMQ queue job-counts from Bull Board's /api/queues (basic-auth).
   * Medusa v2's event bus + workflow engine run on BullMQ; this surfaces
   * waiting/active/failed/... per queue. Returns [] on auth failure or if Bull
   * Board is not reachable — the caller degrades gracefully.
   */
  async queues(): Promise<QueueCounts[]> {
    const res = await getJson<BullBoardResponse>(`${this.base}/api/queues`, {
      timeoutMs: this.timeout,
      basicAuth: {
        user: this.env.BULL_BOARD_USER,
        pass: this.env.BULL_BOARD_PASSWORD,
      },
    })
    if (!res.ok || !res.data?.queues) return []
    return res.data.queues.map((q) => {
      const c = q.counts ?? {}
      return {
        name: q.name,
        waiting: c.waiting ?? 0,
        active: c.active ?? 0,
        completed: c.completed ?? 0,
        failed: c.failed ?? 0,
        delayed: c.delayed ?? 0,
        paused: c.paused ?? 0,
      }
    })
  }
}
