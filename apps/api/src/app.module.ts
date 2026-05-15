import { Module } from "@nestjs/common";
import { AdminModule } from "./admin/admin.module.js";
import { AuthModule } from "./auth/auth.module.js";
import { DatabaseModule } from "./database/database.module.js";
import { ApiGraphqlModule } from "./graphql/graphql.module.js";
import { HealthModule } from "./health/health.module.js";
import { IngestModule } from "./ingest/ingest.module.js";

@Module({
  imports: [DatabaseModule, AuthModule, ApiGraphqlModule, HealthModule, AdminModule, IngestModule]
})
export class AppModule {}
