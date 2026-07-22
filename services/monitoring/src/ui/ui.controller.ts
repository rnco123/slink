import { Controller, Get, Header } from "@nestjs/common"
import { DASHBOARD_HTML } from "./dashboard.html"

/**
 * Serves the self-contained admin Monitoring dashboard. Ungated at the app layer
 * (the page ships no secrets and only calls the same-origin facade); in prod it
 * sits behind the admin subdomain's auth. Served at `/` and `/dashboard`.
 */
@Controller()
export class UiController {
  @Get(["", "dashboard"])
  @Header("Content-Type", "text/html; charset=utf-8")
  @Header("X-Content-Type-Options", "nosniff")
  @Header("Referrer-Policy", "no-referrer")
  dashboard(): string {
    return DASHBOARD_HTML
  }
}
