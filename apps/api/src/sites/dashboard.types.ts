import { Field, Float, ObjectType, registerEnumType } from "@nestjs/graphql";
import { Role } from "../auth/auth.types.js";

export enum TimeRange {
  LAST_24H = "LAST_24H",
  LAST_7D = "LAST_7D",
  LAST_30D = "LAST_30D"
}

registerEnumType(TimeRange, { name: "TimeRange" });

/** Site health: telemetry freshness + active alerts (after Phase 4). */
export enum SiteStatus {
  UNKNOWN = "UNKNOWN",
  OK = "OK",
  WARNING = "WARNING",
  CRITICAL = "CRITICAL"
}

registerEnumType(SiteStatus, { name: "SiteStatus" });

@ObjectType()
export class SiteModel {
  @Field()
  id!: string;

  @Field()
  name!: string;

  @Field(() => Role)
  role!: Role;

  @Field(() => SiteStatus)
  status!: SiteStatus;

  @Field(() => Date, { nullable: true })
  lastUpdate?: Date | null;
}

@ObjectType()
export class MeasurementModel {
  @Field()
  id!: string;

  @Field()
  sensor!: string;

  @Field(() => Float)
  value!: number;

  @Field(() => Date)
  takenAt!: Date;
}
