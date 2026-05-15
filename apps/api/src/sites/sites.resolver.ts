import { ForbiddenException, Inject, NotFoundException, UseGuards } from "@nestjs/common";
import { Args, Query, Resolver } from "@nestjs/graphql";
import type { Database, User } from "@aquaponics/db";
import type { Kysely } from "kysely";
import { CurrentUser } from "../auth/current-user.decorator.js";
import { GqlAuthGuard } from "../auth/gql-auth.guard.js";
import { AuthService } from "../auth/auth.service.js";
import { Role } from "../auth/auth.types.js";
import { DB_TOKEN } from "../database/database.constants.js";
import { SiteModel, SiteStatus, TimeRange } from "./dashboard.types.js";

function userRoleToGql(role: User["role"]): Role {
  return role as Role;
}

@Resolver()
export class SitesResolver {
  constructor(
    @Inject(DB_TOKEN) private readonly db: Kysely<Database>,
    private readonly authService: AuthService
  ) {}

  @UseGuards(GqlAuthGuard)
  @Query(() => [SiteModel])
  async getSites(@CurrentUser() user: User): Promise<SiteModel[]> {
    const rows =
      user.role === "admin"
        ? await this.db.selectFrom("sites").select(["id", "name"]).orderBy("name", "asc").execute()
        : await this.db
            .selectFrom("user_sites")
            .innerJoin("sites", "sites.id", "user_sites.site_id")
            .select(["sites.id as id", "sites.name as name"])
            .where("user_sites.user_id", "=", user.id)
            .orderBy("sites.name", "asc")
            .execute();

    const out: SiteModel[] = [];
    for (const row of rows) {
      out.push(await this.buildSiteModel(user, row.id, row.name));
    }
    return out;
  }

  @UseGuards(GqlAuthGuard)
  @Query(() => SiteModel)
  async getSite(@Args("id") id: string, @CurrentUser() user: User): Promise<SiteModel> {
    if (!(await this.authService.requireSiteAccess(user, id))) {
      throw new ForbiddenException("No access to this site");
    }
    const site = await this.db.selectFrom("sites").select(["id", "name"]).where("id", "=", id).executeTakeFirst();
    if (!site) {
      throw new NotFoundException("Site not found");
    }
    return this.buildSiteModel(user, site.id, site.name);
  }

  private async buildSiteModel(user: User, siteId: string, name: string): Promise<SiteModel> {
    const agg = await this.db
      .selectFrom("measurements")
      .select((eb) => eb.fn.max("taken_at").as("last_taken"))
      .where("site_id", "=", siteId)
      .executeTakeFirst();

    const raw = agg?.last_taken;
    const lastTaken = raw != null ? new Date(raw as string | Date) : null;
    const now = Date.now();
    const twentyFourHoursMs = 24 * 60 * 60 * 1000;
    const status =
      lastTaken && now - lastTaken.getTime() < twentyFourHoursMs ? SiteStatus.OK : SiteStatus.UNKNOWN;

    return {
      id: siteId,
      name,
      role: userRoleToGql(user.role),
      status,
      lastUpdate: lastTaken
    };
  }
}
