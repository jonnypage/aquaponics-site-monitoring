import { Field, ObjectType, registerEnumType } from "@nestjs/graphql";

export enum GqlAlertStatus {
  ACTIVE = "ACTIVE",
  RESOLVED = "RESOLVED"
}

registerEnumType(GqlAlertStatus, { name: "AlertStatus" });

export enum GqlAlertSeverity {
  WARNING = "WARNING",
  CRITICAL = "CRITICAL"
}

registerEnumType(GqlAlertSeverity, { name: "AlertSeverity" });

@ObjectType()
export class AlertModel {
  @Field()
  id!: string;

  @Field()
  siteId!: string;

  @Field(() => String, { nullable: true })
  deviceId?: string | null;

  @Field(() => String, { nullable: true })
  deviceName?: string | null;

  @Field()
  type!: string;

  @Field(() => GqlAlertSeverity)
  severity!: GqlAlertSeverity;

  @Field(() => GqlAlertStatus)
  status!: GqlAlertStatus;

  @Field()
  message!: string;

  @Field(() => Date, { nullable: true })
  lastNotifiedAt?: Date | null;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;
}

export function toAlertModel(row: {
  id: string;
  site_id: string;
  device_id: string | null;
  device_name?: string | null;
  type: string;
  severity: "warning" | "critical";
  status: "active" | "resolved";
  message: string;
  last_notified_at: Date | null;
  created_at: Date;
  updated_at: Date;
}): AlertModel {
  return {
    id: row.id,
    siteId: row.site_id,
    deviceId: row.device_id,
    deviceName: row.device_name ?? null,
    type: row.type,
    severity: row.severity === "critical" ? GqlAlertSeverity.CRITICAL : GqlAlertSeverity.WARNING,
    status: row.status === "active" ? GqlAlertStatus.ACTIVE : GqlAlertStatus.RESOLVED,
    message: row.message,
    lastNotifiedAt: row.last_notified_at != null ? new Date(row.last_notified_at as Date | string) : null,
    createdAt: new Date(row.created_at as Date | string),
    updatedAt: new Date(row.updated_at as Date | string)
  };
}
