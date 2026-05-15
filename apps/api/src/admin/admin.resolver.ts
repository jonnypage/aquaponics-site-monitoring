import { Inject, UseGuards } from "@nestjs/common";
import { Query, Resolver } from "@nestjs/graphql";
import type { Database } from "@aquaponics/db";
import type { Kysely } from "kysely";
import { DB_TOKEN } from "../database/database.constants.js";
import { Roles } from "../auth/roles.decorator.js";
import { RolesGuard } from "../auth/roles.guard.js";
import { GqlAuthGuard } from "../auth/gql-auth.guard.js";
import { Role, UserModel } from "../auth/auth.types.js";

@Resolver()
export class AdminResolver {
  constructor(@Inject(DB_TOKEN) private readonly db: Kysely<Database>) {}

  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles("admin")
  @Query(() => [UserModel])
  async adminUsers(): Promise<UserModel[]> {
    const users = await this.db.selectFrom("users").selectAll().orderBy("created_at", "asc").execute();
    return users.map((user) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as Role,
      createdAt: new Date(user.created_at),
      updatedAt: new Date(user.updated_at)
    }));
  }
}
