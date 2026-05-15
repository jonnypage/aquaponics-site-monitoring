import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { DatabaseModule } from "../database/database.module.js";
import { MeasurementsResolver } from "./measurements.resolver.js";

@Module({
  imports: [DatabaseModule, AuthModule],
  providers: [MeasurementsResolver]
})
export class MeasurementsModule {}
