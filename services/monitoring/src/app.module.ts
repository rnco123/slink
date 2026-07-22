import { Module } from "@nestjs/common"
import { MonitoringModule } from "./monitoring/monitoring.module"
import { HealthController } from "./health/health.controller"
import { UiController } from "./ui/ui.controller"

@Module({
  imports: [MonitoringModule],
  controllers: [HealthController, UiController],
})
export class AppModule {}
