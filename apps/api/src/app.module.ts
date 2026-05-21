import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { AdminModule } from "./admin/admin.module.js";
import { AuthModule } from "./auth/auth.module.js";
import { DatabaseModule } from "./database/database.module.js";
import { ApiGraphqlModule } from "./graphql/graphql.module.js";
import { HealthModule } from "./health/health.module.js";
import { IngestModule } from "./ingest/ingest.module.js";
import { SchedulerModule } from "./scheduler/scheduler.module.js";
import { StorageModule } from "./storage/storage.module.js";

@Module({
  imports: [
    ScheduleModule.forRoot(),
    DatabaseModule,
    StorageModule,
    AuthModule,
    ApiGraphqlModule,
    HealthModule,
    AdminModule,
    IngestModule,
    SchedulerModule
  ]
})
export class AppModule {}
