import { Module } from "@nestjs/common"
import { UpstreamsModule } from "../upstreams/upstreams.module"
import { MonitoringController } from "./monitoring.controller"
import { MonitoringService } from "./monitoring.service"

@Module({
  imports: [UpstreamsModule],
  controllers: [MonitoringController],
  providers: [MonitoringService],
})
export class MonitoringModule {}
