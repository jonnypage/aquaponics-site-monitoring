import { Module } from "@nestjs/common";
import { AdminModule } from "./admin/admin.module.js";
import { AuthModule } from "./auth/auth.module.js";
import { DatabaseModule } from "./database/database.module.js";
import { ApiGraphqlModule } from "./graphql/graphql.module.js";
import { HealthModule } from "./health/health.module.js";

@Module({
  imports: [DatabaseModule, AuthModule, ApiGraphqlModule, HealthModule, AdminModule]
})
export class AppModule {}
