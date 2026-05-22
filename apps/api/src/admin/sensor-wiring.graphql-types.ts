import { Field, InputType, Int, ObjectType } from "@nestjs/graphql";
import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested
} from "class-validator";

@ObjectType()
export class SensorWireDefModel {
  @Field()
  id!: string;

  @Field()
  label!: string;

  @Field()
  color!: string;

  @Field({ nullable: true })
  required?: boolean;
}

@ObjectType()
export class SensorWiringTemplateModel {
  @Field(() => [SensorWireDefModel])
  wires!: SensorWireDefModel[];

  @Field({ nullable: true })
  allowExtraWires?: boolean;

  @Field(() => Int, { nullable: true })
  maxExtraWires?: number;
}

@InputType()
export class SensorWireDefInput {
  @Field()
  @IsString()
  @Matches(/^[a-z][a-z0-9_]*$/)
  @MaxLength(32)
  id!: string;

  @Field()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  label!: string;

  @Field()
  @IsString()
  @MinLength(1)
  @MaxLength(32)
  color!: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  required?: boolean;
}

@InputType()
export class SensorWiringTemplateInput {
  @Field(() => [SensorWireDefInput])
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(8)
  @ValidateNested({ each: true })
  @Type(() => SensorWireDefInput)
  wires!: SensorWireDefInput[];

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  allowExtraWires?: boolean;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  maxExtraWires?: number;
}
