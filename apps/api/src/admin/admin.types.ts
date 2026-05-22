import { Field, Float, InputType, Int, ObjectType } from "@nestjs/graphql";
import { DeviceSnapshotModel } from "../snapshots/snapshots.types.js";
import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested
} from "class-validator";
import { Role } from "../auth/auth.types.js";
import { SensorWiringTemplateInput, SensorWiringTemplateModel } from "./sensor-wiring.graphql-types.js";

@ObjectType()
export class SensorCatalogEntryModel {
  @Field()
  key!: string;

  @Field()
  displayName!: string;

  @Field()
  unit!: string;

  @Field(() => Float, { nullable: true })
  physicalMin?: number | null;

  @Field(() => Float, { nullable: true })
  physicalMax?: number | null;

  @Field(() => Int)
  sortOrder!: number;

  @Field(() => String, { nullable: true })
  icon?: string | null;

  @Field(() => SensorWiringTemplateModel)
  wiringTemplate!: SensorWiringTemplateModel;

  @Field()
  createdAt!: Date;

  @Field()
  updatedAt!: Date;
}

@ObjectType()
export class AdminUserModel {
  @Field()
  id!: string;

  @Field()
  email!: string;

  @Field()
  name!: string;

  @Field(() => Role)
  role!: Role;

  @Field()
  createdAt!: Date;

  @Field()
  updatedAt!: Date;

  @Field(() => [String])
  assignedSiteIds!: string[];
}

@ObjectType()
export class SiteSensorReportingModel {
  @Field()
  sensorKey!: string;

  @Field()
  enabled!: boolean;

  @Field()
  displayName!: string;

  @Field()
  unit!: string;

  @Field(() => Int)
  sortOrder!: number;

  @Field(() => String, { nullable: true })
  icon?: string | null;
}

@ObjectType()
export class SiteSensorThresholdModel {
  @Field()
  sensorKey!: string;

  @Field(() => Float, { nullable: true })
  normalMin?: number | null;

  @Field(() => Float, { nullable: true })
  normalMax?: number | null;

  @Field(() => Float, { nullable: true })
  warningDelta?: number | null;

  @Field(() => Float, { nullable: true })
  criticalDelta?: number | null;
}

@ObjectType()
export class AdminSiteModel {
  @Field()
  id!: string;

  @Field()
  name!: string;

  @Field(() => Float, { nullable: true })
  latitude?: number | null;

  @Field(() => Float, { nullable: true })
  longitude?: number | null;

  @Field(() => [SiteSensorReportingModel])
  sensorReporting!: SiteSensorReportingModel[];

  @Field(() => [SiteSensorThresholdModel])
  sensorThresholds!: SiteSensorThresholdModel[];
}

@ObjectType()
export class AdminDeviceModel {
  @Field()
  deviceId!: string;

  @Field(() => String, { nullable: true })
  name?: string | null;

  @Field(() => String, { nullable: true })
  siteId?: string | null;

  @Field(() => Date, { nullable: true })
  lastSeenAt?: Date | null;

  @Field(() => Int)
  expectedIntervalSeconds!: number;

  @Field(() => Int)
  reportIntervalSeconds!: number;

  @Field(() => Int)
  snapshotIntervalSeconds!: number;

  @Field()
  hasCamera!: boolean;

  @Field(() => Object, { nullable: true })
  pinMap?: Record<string, unknown> | null;

  @Field()
  createdAt!: Date;

  @Field()
  updatedAt!: Date;

  @Field(() => [DeviceSnapshotModel])
  recentSnapshots?: DeviceSnapshotModel[];
}

@ObjectType()
export class CreateAdminDevicePayload {
  @Field(() => AdminDeviceModel)
  device!: AdminDeviceModel;

  @Field()
  plainApiKey!: string;
}

@ObjectType()
export class RotateAdminDeviceApiKeyPayload {
  @Field()
  plainApiKey!: string;
}

@InputType()
export class CreateSensorCatalogEntryInput {
  @Field()
  @IsString()
  @MinLength(1)
  key!: string;

  @Field()
  @IsString()
  @MinLength(1)
  displayName!: string;

  @Field()
  @IsString()
  @MinLength(1)
  unit!: string;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  physicalMin?: number | null;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  physicalMax?: number | null;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsNumber()
  sortOrder?: number | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  icon?: string | null;

  @Field(() => SensorWiringTemplateInput, { nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => SensorWiringTemplateInput)
  wiringTemplate?: SensorWiringTemplateInput;
}

@InputType()
export class UpdateSensorCatalogEntryInput {
  @Field()
  @IsString()
  @MinLength(1)
  key!: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  displayName?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  unit?: string;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  physicalMin?: number | null;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  physicalMax?: number | null;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsNumber()
  sortOrder?: number | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  icon?: string | null;

  @Field(() => SensorWiringTemplateInput, { nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => SensorWiringTemplateInput)
  wiringTemplate?: SensorWiringTemplateInput;
}

@InputType()
export class CreateAdminUserInput {
  @Field()
  @IsEmail()
  email!: string;

  @Field()
  @IsString()
  @MinLength(1)
  name!: string;

  @Field()
  @IsString()
  @MinLength(8)
  password!: string;

  @Field(() => Role)
  @IsEnum(Role)
  role!: Role;

  @Field(() => [String])
  @IsArray()
  @IsUUID("4", { each: true })
  assignedSiteIds!: string[];
}

@InputType()
export class UpdateAdminUserInput {
  @Field()
  @IsUUID("4")
  id!: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsEmail()
  email?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @Field(() => Role, { nullable: true })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  @IsUUID("4", { each: true })
  assignedSiteIds?: string[];
}

@InputType()
export class SiteSensorReportingInput {
  @Field()
  @IsString()
  @MinLength(1)
  sensorKey!: string;

  @Field()
  @IsBoolean()
  enabled!: boolean;
}

@InputType()
export class SiteSensorThresholdInput {
  @Field()
  @IsString()
  @MinLength(1)
  sensorKey!: string;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  normalMin?: number | null;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  normalMax?: number | null;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  warningDelta?: number | null;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  criticalDelta?: number | null;
}

@InputType()
export class CreateAdminSiteInput {
  @Field()
  @IsString()
  @MinLength(1)
  name!: string;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  latitude?: number | null;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  longitude?: number | null;

  @Field(() => [SiteSensorReportingInput])
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SiteSensorReportingInput)
  sensorReporting!: SiteSensorReportingInput[];

  @Field(() => [SiteSensorThresholdInput])
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SiteSensorThresholdInput)
  sensorThresholds!: SiteSensorThresholdInput[];

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  attachDeviceId?: string | null;
}

@InputType()
export class UpdateAdminSiteInput {
  @Field()
  @IsUUID("4")
  id!: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  latitude?: number | null;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  longitude?: number | null;

  @Field(() => [SiteSensorReportingInput], { nullable: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SiteSensorReportingInput)
  sensorReporting?: SiteSensorReportingInput[];

  @Field(() => [SiteSensorThresholdInput], { nullable: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SiteSensorThresholdInput)
  sensorThresholds?: SiteSensorThresholdInput[];

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  attachDeviceId?: string | null;
}

@InputType()
export class CreateAdminDeviceInput {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  name?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsUUID("4")
  siteId?: string | null;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsNumber()
  expectedIntervalSeconds?: number | null;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsNumber()
  reportIntervalSeconds?: number | null;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsNumber()
  snapshotIntervalSeconds?: number | null;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  hasCamera?: boolean | null;
}

@InputType()
export class UpdateAdminDeviceInput {
  @Field()
  @IsString()
  @MinLength(1)
  deviceId!: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  name?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsUUID("4")
  siteId?: string | null;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsNumber()
  expectedIntervalSeconds?: number | null;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsNumber()
  reportIntervalSeconds?: number | null;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsNumber()
  snapshotIntervalSeconds?: number | null;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  hasCamera?: boolean | null;

  @Field(() => Object, { nullable: true })
  @IsOptional()
  pinMap?: Record<string, unknown> | null;
}
