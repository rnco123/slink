import { Controller, Get } from "@nestjs/common"

/**
 * The Monitoring API's OWN liveness endpoint (ungated) for the container
 * HEALTHCHECK and the platform load balancer. Distinct from /monitoring/health,
 * which rolls up the observability upstreams.
 */
@Controller()
export class HealthController {
  private readonly startedAt = Date.now()

  @Get("healthz")
  healthz() {
    return {
      status: "ok",
      service: "monitoring-api",
      uptimeSeconds: Math.round((Date.now() - this.startedAt) / 1000),
      timestamp: new Date().toISOString(),
    }
  }
}
