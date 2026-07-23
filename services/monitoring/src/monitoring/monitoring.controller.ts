import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common"
import { MonitoringService } from "./monitoring.service"
import { TokenGuard } from "../common/token.guard"
import { isMetricKind, METRIC_KINDS } from "../upstreams/promql"

/**
 * The single REST facade the admin panel calls. Read-only. Every handler returns
 * an already-aggregated, PHI-free summary. Guarded by the optional shared token.
 */
@UseGuards(TokenGuard)
@Controller("monitoring")
export class MonitoringController {
  constructor(private readonly svc: MonitoringService) {}

  @Get("health")
  health() {
    return this.svc.health()
  }

  @Get("uptime")
  uptime() {
    return this.svc.uptime()
  }

  @Get("metrics/:kind")
  metrics(@Param("kind") kind: string) {
    if (!isMetricKind(kind)) {
      throw new BadRequestException(
        `unknown metric kind '${kind}'. Expected one of: ${METRIC_KINDS.join(
          ", "
        )}`
      )
    }
    return this.svc.metrics(kind)
  }

  @Get("alerts")
  alerts() {
    return this.svc.alerts()
  }

  @Get("logs")
  logs(
    @Query("service") service?: string,
    @Query("q") q?: string,
    @Query("limit") limit?: string,
    @Query("sinceMinutes") sinceMinutes?: string
  ) {
    const parsedLimit = clampInt(limit, 100, 1, 1000)
    const parsedSince = clampInt(sinceMinutes, 60, 1, 24 * 60)
    return this.svc.logs({
      service,
      query: q,
      limit: parsedLimit,
      sinceMs: parsedSince * 60_000,
    })
  }

  @Get("queues")
  queues() {
    return this.svc.queues()
  }

  @Get("security")
  security() {
    return this.svc.security()
  }

  @Get("seo")
  seo() {
    return this.svc.seo()
  }

  @Get("analytics")
  analytics() {
    return this.svc.analytics()
  }
}

function clampInt(
  raw: string | undefined,
  fallback: number,
  min: number,
  max: number
): number {
  if (raw === undefined) return fallback
  const n = Number.parseInt(raw, 10)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, n))
}
