import { NextResponse } from "next/server"

/**
 * Liveness/readiness probe for the storefront (roadmap task 48).
 *
 * Kept intentionally cheap and dependency-free so uptime monitors (Uptime Kuma,
 * the Caddy healthcheck, ALB/target-group checks) can hit it on a tight interval
 * without touching the backend. It reports only process-level facts — never any
 * customer data (PHI boundary: this route must stay data-free).
 *
 * Excluded from locale middleware via the `api` matcher exclusion, so it is
 * reachable at `/api/health` without a country/language prefix.
 */
export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export function GET() {
  return NextResponse.json(
    {
      status: "ok",
      service: "storefront",
      timestamp: new Date().toISOString(),
      uptime: Math.round(process.uptime()),
      version: process.env.NEXT_PUBLIC_APP_VERSION ?? "dev",
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  )
}
