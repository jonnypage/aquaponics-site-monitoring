import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module.js";
import { IngestController } from "./ingest.controller.js";
import { IngestRateLimiter } from "./ingest-rate-limiter.service.js";
import { IngestService } from "./ingest.service.js";

@Module({
  imports: [DatabaseModule],
  controllers: [IngestController],
  providers: [IngestService, IngestRateLimiter]
})
export class IngestModule {}
