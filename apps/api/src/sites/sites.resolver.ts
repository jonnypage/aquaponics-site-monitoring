import { ForbiddenException, Inject, NotFoundException, UseGuards } from "@nestjs/common";
import { Args, Query, Resolver } from "@nestjs/graphql";
import type { Database, User } from "@aquaponics/db";
import type { Kysely } from "kysely";
import { CurrentUser } from "../auth/current-user.decorator.js";
import { GqlAuthGuard } from "../auth/gql-auth.guard.js";
import { AuthService } from "../auth/auth.service.js";
import { Role } from "../auth/auth.types.js";
import { DB_TOKEN } from "../database/database.constants.js";
import { filterAlertsForEnabledSensorsOnly, loadDisabledSensorsBySite } from "./site-sensor-filter.util.js";
import { SiteModel, SiteStatus } from "./dashboard.types.js";
import { SnapshotsService } from "../snapshots/snapshots.service.js";
import { loadSiteSensorReporting } from "./site-sensor-reporting.util.js";

function userRoleToGql(role: User["role"]): Role {
  return role as Role;
}

@Resolver()
export class SitesResolver {
  constructor(
    @Inject(DB_TOKEN) private readonly db: Kysely<Database>,
    private readonly authService: AuthService,
    private readonly snapshots: SnapshotsService
  ) {}

  @UseGuards(GqlAuthGuard)
  @Query(() => [SiteModel])
  async getSites(@CurrentUser() user: User): Promise<SiteModel[]> {
    const rows =
      user.role === "admin"
        ? await this.db
            .selectFrom("sites")
            .select(["id", "name", "latitude", "longitude"])
            .orderBy("name", "asc")
            .execute()
        : await this.db
            .selectFrom("user_sites")
            .innerJoin("sites", "sites.id", "user_sites.site_id")
            .select([
              "sites.id as id",
              "sites.name as name",
              "sites.latitude as latitude",
              "sites.longitude as longitude"
            ])
            .where("user_sites.user_id", "=", user.id)
            .orderBy("sites.name", "asc")
            .execute();

    const out: SiteModel[] = [];
    for (const row of rows) {
      out.push(
        await this.buildSiteModel(user, row.id, row.name, row.latitude ?? null, row.longitude ?? null)
      );
    }
    return out;
  }

  @UseGuards(GqlAuthGuard)
  @Query(() => SiteModel)
  async getSite(@Args("id") id: string, @CurrentUser() user: User): Promise<SiteModel> {
    if (!(await this.authService.requireSiteAccess(user, id))) {
      throw new ForbiddenException("No access to this site");
    }
    const site = await this.db
      .selectFrom("sites")
      .select(["id", "name", "latitude", "longitude"])
      .where("id", "=", id)
      .executeTakeFirst();
    if (!site) {
      throw new NotFoundException("Site not found");
    }
    return this.buildSiteModel(user, site.id, site.name, site.latitude ?? null, site.longitude ?? null);
  }

  private async buildSiteModel(
    user: User,
    siteId: string,
    name: string,
    latitude: number | null,
    longitude: number | null
  ): Promise<SiteModel> {
    const agg = await this.db
      .selectFrom("measurements")
      .select((eb) => eb.fn.max("taken_at").as("last_taken"))
      .where("site_id", "=", siteId)
      .executeTakeFirst();

    const raw = agg?.last_taken;
    const lastTaken = raw != null ? new Date(raw as string | Date) : null;
    const now = Date.now();
    const twentyFourHoursMs = 24 * 60 * 60 * 1000;
    const recent = lastTaken != null && now - lastTaken.getTime() < twentyFourHoursMs;

    const activeRows = await this.db
      .selectFrom("alerts")
      .select(["type", "severity"])
      .where("site_id", "=", siteId)
      .where("status", "=", "active")
      .execute();

    const disabledBySite = await loadDisabledSensorsBySite(this.db, [siteId]);
    const filteredActive = filterAlertsForEnabledSensorsOnly(
      activeRows.map((a) => ({ site_id: siteId, type: a.type, severity: a.severity })),
      disabledBySite
    );

    const sensorReporting = await loadSiteSensorReporting(this.db, siteId);

    const hasCritical = filteredActive.some((a) => a.severity === "critical");
    const hasWarning = filteredActive.some((a) => a.severity === "warning");

    let status: SiteStatus;
    if (hasCritical) {
      status = SiteStatus.CRITICAL;
    } else if (hasWarning) {
      status = SiteStatus.WARNING;
    } else if (recent) {
      status = SiteStatus.OK;
    } else {
      status = SiteStatus.UNKNOWN;
    }

    const latestSnapshot = await this.snapshots.getLatestForSite(siteId);

    return {
      id: siteId,
      name,
      role: userRoleToGql(user.role),
      status,
      lastUpdate: lastTaken,
      sensorReporting,
      latitude,
      longitude,
      latestSnapshot
    };
  }
}
