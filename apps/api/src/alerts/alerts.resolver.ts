import { Args, Mutation, Query, Resolver } from "@nestjs/graphql";
import type { User } from "@aquaponics/db";
import { UseGuards } from "@nestjs/common";

import { CurrentUser } from "../auth/current-user.decorator.js";
import { GqlAuthGuard } from "../auth/gql-auth.guard.js";
import { AlertsService } from "./alerts.service.js";
import { AlertModel, GqlAlertStatus, toAlertModel } from "./alerts.types.js";

@Resolver()
export class AlertsResolver {
  constructor(private readonly alertsService: AlertsService) {}

  @UseGuards(GqlAuthGuard)
  @Query(() => [AlertModel])
  async getAlerts(
    @CurrentUser() user: User,
    @Args("siteId", { type: () => String, nullable: true }) siteId?: string | null,
    @Args("type", { type: () => String, nullable: true }) type?: string | null,
    @Args("status", { type: () => GqlAlertStatus, nullable: true }) status?: GqlAlertStatus | null
  ): Promise<AlertModel[]> {
    const dbStatus =
      status === GqlAlertStatus.ACTIVE ? "active" : status === GqlAlertStatus.RESOLVED ? "resolved" : undefined;

    const rows = await this.alertsService.listAlertsForUser(user, {
      siteId: siteId ?? undefined,
      type: type ?? undefined,
      status: dbStatus
    });
    return rows.map(toAlertModel);
  }

  @UseGuards(GqlAuthGuard)
  @Mutation(() => Boolean)
  async resolveAlert(@CurrentUser() user: User, @Args("id") id: string): Promise<boolean> {
    return this.alertsService.resolveAlertForUser(user, id);
  }
}
