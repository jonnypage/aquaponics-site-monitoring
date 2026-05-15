import { Module } from "@nestjs/common";
import { AlertsModule } from "../alerts/alerts.module.js";
import { IngestModule } from "../ingest/ingest.module.js";
import { SchedulerService } from "./scheduler.service.js";

@Module({
  imports: [IngestModule, AlertsModule],
  providers: [SchedulerService]
})
export class SchedulerModule {}
