import { Inject, Injectable } from "@nestjs/common";
import type { Database, SensorType as DbSensorType } from "@aquaponics/db";
import type { Kysely } from "kysely";

import { DB_TOKEN } from "../database/database.constants.js";
import { isDeviceConsideredOffline } from "../alerts/device-offline.util.js";
import { deviceDisplayLabel } from "../alerts/alert-message.util.js";
import { filterAlertsForEnabledSensorsOnly, loadAlertFilterContext } from "../sites/site-sensor-filter.util.js";
import { evaluateHeuristicsForSensor, heuristicTypesForSensorType } from "./ingest-heuristics.util.js";
import type { HistoryPoint } from "./ingest-heuristics.util.js";
import { classifyRangeAnomaly, effectiveNormalBounds } from "./range-anomaly.util.js";

type DbExec = Kysely<Database>;

@Injectable()
export class IngestAlertService {
  constructor(@Inject(DB_TOKEN) private readonly db: Kysely<Database>) {}

  rangeAlertTypes(deviceId: string, sensorKey: string): [string, string] {
    return [`range_warning:${deviceId}:${sensorKey}`, `range_violation:${deviceId}:${sensorKey}`];
  }

  async resolveRangePairForSensor(
    executor: DbExec,
    siteId: string,
    deviceId: string,
    sensorKey: string
  ): Promise<void> {
    const [warnType, violType] = this.rangeAlertTypes(deviceId, sensorKey);
    const now = new Date();
    await executor
      .updateTable("alerts")
      .set({ status: "resolved", updated_at: now })
      .where("site_id", "=", siteId)
      .where("type", "in", [warnType, violType])
      .where("status", "=", "active")
      .execute();
  }

  async upsertActiveAlert(
    executor: DbExec,
    input: {
      siteId: string;
      deviceId: string;
      type: string;
      severity: "warning" | "critical";
      message: string;
    }
  ): Promise<void> {
    const now = new Date();
    const existing = await executor
      .selectFrom("alerts")
      .select("id")
      .where("site_id", "=", input.siteId)
      .where("type", "=", input.type)
      .where("status", "=", "active")
      .executeTakeFirst();

    if (existing) {
      await executor
        .updateTable("alerts")
        .set({
          severity: input.severity,
          message: input.message,
          device_id: input.deviceId,
          updated_at: now
        })
        .where("id", "=", existing.id)
        .execute();
      return;
    }

    await executor
      .insertInto("alerts")
      .values({
        site_id: input.siteId,
        device_id: input.deviceId,
        type: input.type,
        severity: input.severity,
        status: "active",
        message: input.message,
        created_at: now,
        updated_at: now
      })
      .execute();
  }

  async resolveActiveAlertByType(executor: DbExec, siteId: string, type: string): Promise<void> {
    const now = new Date();
    await executor
      .updateTable("alerts")
      .set({ status: "resolved", updated_at: now })
      .where("site_id", "=", siteId)
      .where("type", "=", type)
      .where("status", "=", "active")
      .execute();
  }

  /** Resolve heuristic alert types for a device + family when no enabled sensors remain. */
  async resolveHeuristicTypesForDeviceSensorType(
    executor: DbExec,
    siteId: string,
    deviceId: string,
    sensorType: DbSensorType
  ): Promise<void> {
    for (const type of heuristicTypesForSensorType(sensorType, deviceId)) {
      await this.resolveActiveAlertByType(executor, siteId, type);
    }
  }
  private async siteHasEnabledSensorOfTypeOnDevice(
    executor: DbExec,
    siteId: string,
    deviceId: string,
    sensorType: DbSensorType
  ): Promise<boolean> {
    const row = await executor
      .selectFrom("site_sensor_catalog")
      .innerJoin("sensor_catalog", "sensor_catalog.key", "site_sensor_catalog.sensor")
      .select("site_sensor_catalog.sensor")
      .where("site_sensor_catalog.site_id", "=", siteId)
      .where("site_sensor_catalog.device_id", "=", deviceId)
      .where("site_sensor_catalog.enabled", "=", true)
      .where("sensor_catalog.sensor_type", "=", sensorType)
      .executeTakeFirst();
    return row != null;
  }

  async maybeResolveHeuristicTypesForSensorType(
    executor: DbExec,
    siteId: string,
    deviceId: string,
    sensorType: DbSensorType
  ): Promise<void> {
    const stillEnabled = await this.siteHasEnabledSensorOfTypeOnDevice(executor, siteId, deviceId, sensorType);
    if (!stillEnabled) {
      await this.resolveHeuristicTypesForDeviceSensorType(executor, siteId, deviceId, sensorType);
    }
  }


  /**
   * Upsert or resolve heuristic alerts (spike / flatline / drift / level-flow) from recent history.
   * Call after inserting the current measurement so history includes the new point.
   */
  async syncHeuristicAlertsForReading(
    executor: DbExec,
    params: {
      siteId: string;
      deviceId: string;
      sensorType: DbSensorType;
      takenAt: Date;
      sensorEnabled: boolean;
      historyNewestFirst: HistoryPoint[];
    }
  ): Promise<void> {
    const { siteId, deviceId, sensorType, takenAt, sensorEnabled, historyNewestFirst } = params;

    if (!sensorEnabled) {
      await this.maybeResolveHeuristicTypesForSensorType(executor, siteId, deviceId, sensorType);
      return;
    }

    const types = heuristicTypesForSensorType(sensorType, deviceId);
    if (types.length === 0) {
      return;
    }

    const findings = evaluateHeuristicsForSensor(sensorType, historyNewestFirst, takenAt);
    const byType = new Map<string, { severity: "warning" | "critical"; message: string }>();
    for (const f of findings) {
      const existing = byType.get(f.type);
      if (!existing || (f.severity === "critical" && existing.severity === "warning")) {
        byType.set(f.type, { severity: f.severity, message: f.message });
      }
    }

    for (const type of types) {
      const baseType = type.includes(":") ? type.slice(0, type.indexOf(":")) : type;
      const hit = byType.get(baseType);
      if (hit) {
        await this.upsertActiveAlert(executor, {
          siteId,
          deviceId,
          type,
          severity: hit.severity,
          message: hit.message
        });
      } else {
        await this.resolveActiveAlertByType(executor, siteId, type);
      }
    }
  }

  /**
   * Sync range alerts for one measurement row (idempotent upsert / resolve).
   * If the sensor is disabled in `site_sensor_catalog`, active range alerts for that key are resolved.
   */
  async syncRangeAlertForReading(
    executor: DbExec,
    params: {
      siteId: string;
      deviceId: string;
      sensorKey: string;
      value: number;
      physicalMin: number | null;
      physicalMax: number | null;
      threshold:
        | {
            normal_min: number | null;
            normal_max: number | null;
            warning_delta: number | null;
            critical_delta: number | null;
          }
        | undefined;
      sensorEnabled: boolean;
    }
  ): Promise<void> {
    const { siteId, deviceId, sensorKey, value, physicalMin, physicalMax, threshold, sensorEnabled } = params;

    if (!sensorEnabled) {
      await this.resolveRangePairForSensor(executor, siteId, deviceId, sensorKey);
      return;
    }

    const bounds = effectiveNormalBounds(physicalMin, physicalMax, threshold);
    if (!bounds) {
      await this.resolveRangePairForSensor(executor, siteId, deviceId, sensorKey);
      return;
    }

    const decision = classifyRangeAnomaly(
      sensorKey,
      value,
      bounds.normalMin,
      bounds.normalMax,
      threshold?.warning_delta,
      threshold?.critical_delta
    );

    const [warnType, violType] = this.rangeAlertTypes(deviceId, sensorKey);
    const now = new Date();

    if (!decision) {
      await this.resolveRangePairForSensor(executor, siteId, deviceId, sensorKey);
      return;
    }

    if (decision.severity === "critical") {
      await executor
        .updateTable("alerts")
        .set({ status: "resolved", updated_at: now })
        .where("site_id", "=", siteId)
        .where("type", "=", warnType)
        .where("status", "=", "active")
        .execute();

      await this.upsertActiveAlert(executor, {
        siteId,
        deviceId,
        type: violType,
        severity: "critical",
        message: decision.message
      });
      return;
    }

    await executor
      .updateTable("alerts")
      .set({ status: "resolved", updated_at: now })
      .where("site_id", "=", siteId)
      .where("type", "=", violType)
      .where("status", "=", "active")
      .execute();

    await this.upsertActiveAlert(executor, {
      siteId,
      deviceId,
      type: warnType,
      severity: "warning",
      message: decision.message
    });
  }

  /**
   * Recompute `device_offline` from all devices on the site (call after ingest updates `last_seen_at`).
   * One active `device_offline` per site when any device exceeds its offline threshold.
   */
  async syncDeviceOfflineStateForSite(executor: DbExec, siteId: string, nowMs: number = Date.now()): Promise<void> {
    const devices = await executor
      .selectFrom("devices")
      .select(["device_id", "name", "last_seen_at", "checkin_interval_seconds"])
      .where("site_id", "=", siteId)
      .execute();

    const stale = devices.filter((d) =>
      isDeviceConsideredOffline(
        d.last_seen_at != null ? new Date(d.last_seen_at as Date | string) : null,
        d.checkin_interval_seconds,
        nowMs
      )
    );

    if (stale.length === 0) {
      const now = new Date(nowMs);
      await executor
        .updateTable("alerts")
        .set({ status: "resolved", updated_at: now })
        .where("site_id", "=", siteId)
        .where("type", "=", "device_offline")
        .where("status", "=", "active")
        .execute();
      return;
    }

    const staleSorted = [...stale].sort((a, b) => a.device_id.localeCompare(b.device_id));
    const labels = staleSorted.map((d) => deviceDisplayLabel(d.device_id, d.name)).sort((a, b) => a.localeCompare(b));
    const message =
      stale.length === 1
        ? `Device ${labels[0]} has not reported within its offline threshold.`
        : `Devices offline (no recent telemetry): ${labels.join(", ")}.`;

    await this.upsertActiveAlert(executor, {
      siteId,
      deviceId: staleSorted[0]!.device_id,
      type: "device_offline",
      severity: "critical",
      message
    });
  }

  /** Scheduler: every site that has at least one device. */
  async syncAllDeviceOfflineStates(nowMs: number = Date.now()): Promise<void> {
    const rows = await this.db.selectFrom("devices").select("site_id").distinct().execute();
    for (const { site_id } of rows) {
      if (site_id == null) {
        continue;
      }
      await this.syncDeviceOfflineStateForSite(this.db, site_id, nowMs);
    }
  }

  async siteHasAnyActiveAlert(siteId: string): Promise<boolean> {
    const rows = await this.db
      .selectFrom("alerts")
      .select(["type"])
      .where("site_id", "=", siteId)
      .where("status", "=", "active")
      .execute();

    const { disabledBySite, enabledBySite, sensorTypeByKey } = await loadAlertFilterContext(this.db, [siteId]);
    const filtered = filterAlertsForEnabledSensorsOnly(
      rows.map((r) => ({ site_id: siteId, type: r.type })),
      disabledBySite,
      enabledBySite,
      sensorTypeByKey
    );
    return filtered.length > 0;
  }
}
