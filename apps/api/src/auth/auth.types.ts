import { Field, InputType, ObjectType, registerEnumType } from "@nestjs/graphql";
import { IsEmail, IsOptional, IsString, MinLength } from "class-validator";

export enum Role {
  ADMIN = "admin",
  SITE_MANAGER = "site_manager",
  SITE_VIEWER = "site_viewer"
}

registerEnumType(Role, { name: "Role" });

@ObjectType()
export class UserModel {
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
}

@InputType()
export class LoginInput {
  @Field()
  @IsEmail()
  email!: string;

  @Field()
  @IsString()
  @MinLength(1)
  password!: string;
}

@ObjectType()
export class AuthPayload {
  @Field()
  ok!: boolean;

  @Field(() => UserModel)
  user!: UserModel;
}

@InputType()
export class UpdateMeInput {
  @Field()
  @IsString()
  @MinLength(1)
  currentPassword!: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsEmail()
  email?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MinLength(8)
  newPassword?: string;
}
