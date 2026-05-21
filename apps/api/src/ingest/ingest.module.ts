import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module.js";
import { IngestController } from "./ingest.controller.js";
import { IngestAlertService } from "./ingest-alert.service.js";
import { IngestRateLimiter } from "./ingest-rate-limiter.service.js";
import { IngestSnapshotService } from "./ingest-snapshot.service.js";
import { IngestService } from "./ingest.service.js";

@Module({
  imports: [DatabaseModule],
  controllers: [IngestController],
  providers: [IngestService, IngestSnapshotService, IngestAlertService, IngestRateLimiter],
  exports: [IngestAlertService]
})
export class IngestModule {}
