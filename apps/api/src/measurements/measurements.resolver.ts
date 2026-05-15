import { ForbiddenException, Inject, UseGuards } from "@nestjs/common";
import { Args, Query, Resolver } from "@nestjs/graphql";
import type { Database, User } from "@aquaponics/db";
import type { Kysely } from "kysely";
import { CurrentUser } from "../auth/current-user.decorator.js";
import { GqlAuthGuard } from "../auth/gql-auth.guard.js";
import { AuthService } from "../auth/auth.service.js";
import { DB_TOKEN } from "../database/database.constants.js";
import { MeasurementModel, TimeRange } from "../sites/dashboard.types.js";

function rangeToSinceMs(range: TimeRange): number {
  const now = Date.now();
  switch (range) {
    case TimeRange.LAST_24H:
      return now - 24 * 60 * 60 * 1000;
    case TimeRange.LAST_7D:
      return now - 7 * 24 * 60 * 60 * 1000;
    case TimeRange.LAST_30D:
      return now - 30 * 24 * 60 * 60 * 1000;
    default:
      return now - 24 * 60 * 60 * 1000;
  }
}

function rangeToLimit(range: TimeRange): number {
  switch (range) {
    case TimeRange.LAST_24H:
      return 5000;
    case TimeRange.LAST_7D:
      return 20000;
    case TimeRange.LAST_30D:
      return 50000;
    default:
      return 5000;
  }
}

@Resolver()
export class MeasurementsResolver {
  constructor(
    @Inject(DB_TOKEN) private readonly db: Kysely<Database>,
    private readonly authService: AuthService
  ) {}

  @UseGuards(GqlAuthGuard)
  @Query(() => [MeasurementModel])
  async getMeasurements(
    @Args("siteId") siteId: string,
    @Args("range", { type: () => TimeRange }) range: TimeRange,
    @CurrentUser() user: User
  ): Promise<MeasurementModel[]> {
    if (!(await this.authService.requireSiteAccess(user, siteId))) {
      throw new ForbiddenException("No access to this site");
    }
    const since = new Date(rangeToSinceMs(range));
    const limit = rangeToLimit(range);
    const rows = await this.db
      .selectFrom("measurements")
      .select(["id", "sensor", "value", "taken_at"])
      .where("site_id", "=", siteId)
      .where("taken_at", ">=", since)
      .orderBy("taken_at", "desc")
      .limit(limit)
      .execute();

    return rows.map((r) => ({
      id: r.id,
      sensor: r.sensor,
      value: r.value,
      takenAt: new Date(r.taken_at as string | Date)
    }));
  }

  @UseGuards(GqlAuthGuard)
  @Query(() => [MeasurementModel])
  async getSensorMeasurements(
    @Args("siteId") siteId: string,
    @Args("sensorKey") sensorKey: string,
    @Args("range", { type: () => TimeRange }) range: TimeRange,
    @CurrentUser() user: User
  ): Promise<MeasurementModel[]> {
    if (!(await this.authService.requireSiteAccess(user, siteId))) {
      throw new ForbiddenException("No access to this site");
    }
    const since = new Date(rangeToSinceMs(range));
    const limit = rangeToLimit(range);
    const rows = await this.db
      .selectFrom("measurements")
      .select(["id", "sensor", "value", "taken_at"])
      .where("site_id", "=", siteId)
      .where("sensor", "=", sensorKey)
      .where("taken_at", ">=", since)
      .orderBy("taken_at", "desc")
      .limit(limit)
      .execute();

    return rows.map((r) => ({
      id: r.id,
      sensor: r.sensor,
      value: r.value,
      takenAt: new Date(r.taken_at as string | Date)
    }));
  }
}
