import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module.js";
import { SnapshotsService } from "./snapshots.service.js";

@Module({
  imports: [DatabaseModule],
  providers: [SnapshotsService],
  exports: [SnapshotsService]
})
export class SnapshotsModule {}
