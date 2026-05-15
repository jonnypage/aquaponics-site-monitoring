import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module.js";
import { AuthResolver } from "./auth.resolver.js";
import { AuthService } from "./auth.service.js";
import { RolesGuard } from "./roles.guard.js";

@Module({
  imports: [DatabaseModule],
  providers: [AuthService, AuthResolver, RolesGuard],
  exports: [AuthService, RolesGuard]
})
export class AuthModule {}
