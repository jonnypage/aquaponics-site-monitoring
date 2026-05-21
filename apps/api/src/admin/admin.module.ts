import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { DatabaseModule } from "../database/database.module.js";
import { IngestModule } from "../ingest/ingest.module.js";
import { SnapshotsModule } from "../snapshots/snapshots.module.js";
import { AdminDeviceResolver } from "./admin-device.resolver.js";
import { AdminResolver } from "./admin.resolver.js";
import { AdminService } from "./admin.service.js";

@Module({
  imports: [DatabaseModule, AuthModule, IngestModule, SnapshotsModule],
  providers: [AdminResolver, AdminDeviceResolver, AdminService]
})
export class AdminModule {}
