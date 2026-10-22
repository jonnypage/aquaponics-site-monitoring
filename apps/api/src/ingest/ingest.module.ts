import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module.js";
import { StorageModule } from "../storage/storage.module.js";
import { CheckinController } from "./checkin.controller.js";
import { CheckinService } from "./checkin.service.js";
import { IngestController } from "./ingest.controller.js";
import { IngestAlertService } from "./ingest-alert.service.js";
import { IngestRateLimiter } from "./ingest-rate-limiter.service.js";
import { IngestSnapshotService } from "./ingest-snapshot.service.js";
import { IngestService } from "./ingest.service.js";

@Module({
  imports: [DatabaseModule, StorageModule],
  controllers: [IngestController, CheckinController],
  providers: [IngestService, IngestSnapshotService, CheckinService, IngestAlertService, IngestRateLimiter],
  exports: [IngestAlertService]
})
export class IngestModule {}
