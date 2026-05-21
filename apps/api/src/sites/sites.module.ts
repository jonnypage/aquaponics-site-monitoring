import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { DatabaseModule } from "../database/database.module.js";
import { SnapshotsModule } from "../snapshots/snapshots.module.js";
import { SitesResolver } from "./sites.resolver.js";

@Module({
  imports: [DatabaseModule, AuthModule, SnapshotsModule],
  providers: [SitesResolver]
})
export class SitesModule {}
