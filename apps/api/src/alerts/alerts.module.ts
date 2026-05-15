import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { DatabaseModule } from "../database/database.module.js";
import { AlertsResolver } from "./alerts.resolver.js";
import { AlertsService } from "./alerts.service.js";
import { ResendMailerService } from "./resend-mailer.service.js";

@Module({
  imports: [DatabaseModule, AuthModule],
  providers: [AlertsService, AlertsResolver, ResendMailerService],
  exports: [AlertsService, ResendMailerService]
})
export class AlertsModule {}
