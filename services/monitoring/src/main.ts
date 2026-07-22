import "reflect-metadata"
import { NestFactory } from "@nestjs/core"
import { Logger } from "@nestjs/common"
import { AppModule } from "./app.module"
import { loadEnv } from "./config/env"

async function bootstrap(): Promise<void> {
  // Fail fast on bad config, naming the offending var.
  const env = loadEnv()
  const log = new Logger("monitoring-api")

  const app = await NestFactory.create(AppModule, { logger: ["log", "warn", "error"] })

  // CORS: only the configured admin origin(s); empty = no cross-origin.
  const origins = env.MONITORING_CORS_ORIGINS.split(",").map((s) => s.trim()).filter(Boolean)
  app.enableCors({
    origin: origins.length > 0 ? origins : false,
    methods: ["GET"],
    credentials: false,
  })

  await app.listen(env.MONITORING_API_PORT, env.MONITORING_API_BIND)
  log.log(
    `Monitoring API listening on http://${env.MONITORING_API_BIND}:${env.MONITORING_API_PORT} ` +
      `(env=${env.NODE_ENV}, token=${env.MONITORING_API_TOKEN ? "on" : "off"})`
  )
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("[monitoring-api] fatal boot error:", err instanceof Error ? err.message : err)
  process.exit(1)
})
