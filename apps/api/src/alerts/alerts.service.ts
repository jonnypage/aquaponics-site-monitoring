import { ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { Database, User } from "@aquaponics/db";
import type { Kysely } from "kysely";
import { sql } from "kysely";

import { AuthService } from "../auth/auth.service.js";
import { DB_TOKEN } from "../database/database.constants.js";
import { filterAlertsForEnabledSensorsOnly, loadAlertFilterContext } from "../sites/site-sensor-filter.util.js";
import { heuristicAlertSensorType, sensorCatalogKeyFromAlertType } from "../sites/alert-sensor-key.util.js";

export interface AlertRow {
  id: string;
  site_id: string;
  device_id: string | null;
  device_name: string | null;
  type: string;
  severity: "warning" | "critical";
  status: "active" | "resolved";
  message: string;
  last_notified_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

@Injectable()
export class AlertsService {
  constructor(
    @Inject(DB_TOKEN) private readonly db: Kysely<Database>,
    private readonly authService: AuthService
  ) {}

  async listAlertsForUser(
    user: User,
    filters: { siteId?: string; type?: string; status?: "active" | "resolved" }
  ): Promise<AlertRow[]> {
    if (filters.siteId != null && filters.siteId !== "") {
      if (!(await this.authService.requireSiteAccess(user, filters.siteId))) {
        throw new ForbiddenException("No access to this site");
      }
    }

    let q = this.db
      .selectFrom("alerts")
      .leftJoin("devices", "devices.device_id", "alerts.device_id")
      .select([
        "alerts.id",
        "alerts.site_id",
        "alerts.device_id",
        "devices.name as device_name",
        "alerts.type",
        "alerts.severity",
        "alerts.status",
        "alerts.message",
        "alerts.last_notified_at",
        "alerts.created_at",
        "alerts.updated_at"
      ])
      .orderBy("alerts.updated_at", "desc")
      .limit(200);

    if (user.role !== "admin") {
      const siteIds = this.db
        .selectFrom("user_sites")
        .select("site_id")
        .where("user_id", "=", user.id);
      q = q.where("alerts.site_id", "in", siteIds);
    }

    if (filters.siteId != null && filters.siteId !== "") {
      q = q.where("alerts.site_id", "=", filters.siteId);
    }
    if (filters.type != null && filters.type !== "") {
      q = q.where("alerts.type", "=", filters.type);
    }
    if (filters.status != null) {
      q = q.where("alerts.status", "=", filters.status);
    }

    const rows = (await q.execute()) as AlertRow[];
    const siteIds = [...new Set(rows.map((r) => r.site_id))];
    const { disabledBySite, enabledBySite, sensorTypeByKey } = await loadAlertFilterContext(this.db, siteIds);
    return filterAlertsForEnabledSensorsOnly(rows, disabledBySite, enabledBySite, sensorTypeByKey);
  }

  async resolveAlertForUser(user: User, alertId: string): Promise<boolean> {
    const alert = await this.db.selectFrom("alerts").selectAll().where("id", "=", alertId).executeTakeFirst();
    if (!alert) {
      throw new NotFoundException("Alert not found");
    }
    if (!(await this.authService.requireSiteAccess(user, alert.site_id))) {
      throw new ForbiddenException("No access to this alert");
    }

    const now = new Date();
    await this.db
      .updateTable("alerts")
      .set({ status: "resolved", updated_at: now })
      .where("id", "=", alertId)
      .where("status", "=", "active")
      .execute();

    return true;
  }

  async listCriticalAlertsNeedingNotify(threshold: Date) {
    const rows = await this.db
      .selectFrom("alerts")
      .innerJoin("sites", "sites.id", "alerts.site_id")
      .select([
        "alerts.id",
        "alerts.site_id",
        "alerts.type",
        "alerts.message",
        sql<string>`sites.name`.as("site_name")
      ])
      .where("alerts.status", "=", "active")
      .where("alerts.severity", "=", "critical")
      .where((eb) =>
        eb.or([eb("alerts.last_notified_at", "is", null), eb("alerts.last_notified_at", "<", threshold)])
      )
      .orderBy("alerts.created_at", "asc")
      .limit(50)
      .execute();

    const siteIds = [...new Set(rows.map((r) => r.site_id))];
    const { disabledBySite, enabledBySite, sensorTypeByKey } = await loadAlertFilterContext(this.db, siteIds);

    return rows.filter((r) => {
      const key = sensorCatalogKeyFromAlertType(r.type);
      if (key != null) {
        return !(disabledBySite.get(r.site_id)?.has(key) ?? false);
      }
      const sensorType = heuristicAlertSensorType(r.type);
      if (sensorType != null) {
        const enabled = enabledBySite.get(r.site_id);
        if (!enabled) {
          return false;
        }
        for (const enabledKey of enabled) {
          if (sensorTypeByKey.get(enabledKey) === sensorType) {
            return true;
          }
        }
        return false;
      }
      return true;
    });
  }

  /**
   * Atomic claim for email send: only one concurrent scheduler instance should pass.
   * Returns true when this call updated the row (caller should send email).
   */
  async claimCriticalNotifySlot(alertId: string, threshold: Date): Promise<boolean> {
    const now = new Date();
    const updated = await this.db
      .updateTable("alerts")
      .set({ last_notified_at: now, updated_at: now })
      .where("id", "=", alertId)
      .where("status", "=", "active")
      .where("severity", "=", "critical")
      .where((eb) =>
        eb.or([eb("last_notified_at", "is", null), eb("last_notified_at", "<", threshold)])
      )
      .returning("id")
      .executeTakeFirst();

    return updated != null;
  }

  async resolveRecipientEmailsForSite(siteId: string): Promise<string[]> {
    const admins = await this.db.selectFrom("users").select("email").where("role", "=", "admin").execute();

    const assigned = await this.db
      .selectFrom("users")
      .innerJoin("user_sites", "user_sites.user_id", "users.id")
      .select("users.email as email")
      .where("user_sites.site_id", "=", siteId)
      .execute();

    const emails = new Set<string>();
    for (const r of admins) {
      emails.add(r.email.toLowerCase().trim());
    }
    for (const r of assigned) {
      emails.add(r.email.toLowerCase().trim());
    }
    return [...emails];
  }
}
