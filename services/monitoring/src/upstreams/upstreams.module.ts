import { Module } from "@nestjs/common"
import { PrometheusClient } from "./prometheus.client"
import { AlertmanagerClient } from "./alertmanager.client"
import { LokiClient } from "./loki.client"
import { UptimeKumaClient } from "./uptimekuma.client"
import { BullBoardClient } from "./bullboard.client"
import { GrafanaClient } from "./grafana.client"
import { CacheService } from "../common/cache.service"

const providers = [
  PrometheusClient,
  AlertmanagerClient,
  LokiClient,
  UptimeKumaClient,
  BullBoardClient,
  GrafanaClient,
  CacheService,
]

@Module({
  providers,
  exports: providers,
})
export class UpstreamsModule {}
