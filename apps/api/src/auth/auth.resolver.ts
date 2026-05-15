import { UseGuards } from "@nestjs/common";
import { Args, Context, Mutation, Query, Resolver } from "@nestjs/graphql";
import type { User } from "@aquaponics/db";
import { CurrentUser } from "./current-user.decorator.js";
import type { GqlContext } from "./gql-context.js";
import { GqlAuthGuard } from "./gql-auth.guard.js";
import { AuthPayload, LoginInput, Role, UserModel } from "./auth.types.js";
import { AuthService } from "./auth.service.js";

function toUserModel(user: User): UserModel {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as Role,
    createdAt: new Date(user.created_at),
    updatedAt: new Date(user.updated_at)
  };
}

@Resolver()
export class AuthResolver {
  constructor(private readonly authService: AuthService) {}

  @Mutation(() => AuthPayload)
  async login(
    @Args("input", { type: () => LoginInput }) input: LoginInput,
    @Context() ctx: GqlContext
  ): Promise<AuthPayload> {
    const user = await this.authService.authenticate(input.email, input.password);
    this.authService.setSessionCookie(ctx.res, user.id);
    return {
      ok: true,
      user: toUserModel(user)
    };
  }

  @Mutation(() => Boolean)
  async logout(@Context() ctx: GqlContext): Promise<boolean> {
    this.authService.clearSessionCookie(ctx.res);
    return true;
  }

  @UseGuards(GqlAuthGuard)
  @Query(() => UserModel)
  async getMe(@CurrentUser() user: User): Promise<UserModel> {
    return toUserModel(user);
  }
}
