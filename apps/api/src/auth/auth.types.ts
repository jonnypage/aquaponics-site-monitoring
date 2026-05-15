import { Field, InputType, ObjectType, registerEnumType } from "@nestjs/graphql";
import { IsEmail, IsString, MinLength } from "class-validator";

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
