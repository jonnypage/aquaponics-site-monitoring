import { Inject, Injectable } from "@nestjs/common";
import type { Database } from "@aquaponics/db";
import type { Kysely } from "kysely";

import { DB_TOKEN } from "../database/database.constants.js";
import { isDeviceConsideredOffline } from "../alerts/device-offline.util.js";
import { filterAlertsForEnabledSensorsOnly, loadDisabledSensorsBySite } from "../sites/site-sensor-filter.util.js";
import { evaluateHeuristicsForSensor, heuristicTypesForSensor } from "./ingest-heuristics.util.js";
import type { HistoryPoint } from "./ingest-heuristics.util.js";
import { classifyRangeAnomaly, effectiveNormalBounds } from "./range-anomaly.util.js";

type DbExec = Kysely<Database>;

@Injectable()
export class IngestAlertService {
  constructor(@Inject(DB_TOKEN) private readonly db: Kysely<Database>) {}

  rangeAlertTypes(sensorKey: string): [string, string] {
    return [`range_warning:${sensorKey}`, `range_violation:${sensorKey}`];
  }

  async resolveRangePairForSensor(executor: DbExec, siteId: string, sensorKey: string): Promise<void> {
    const [warnType, violType] = this.rangeAlertTypes(sensorKey);
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

  /** Resolve MVP heuristic alert types for this sensor (e.g. sensor disabled). */
  async resolveHeuristicTypesForSiteSensor(executor: DbExec, siteId: string, sensorKey: string): Promise<void> {
    for (const type of heuristicTypesForSensor(sensorKey)) {
      await this.resolveActiveAlertByType(executor, siteId, type);
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
      sensorKey: string;
      takenAt: Date;
      sensorEnabled: boolean;
      historyNewestFirst: HistoryPoint[];
    }
  ): Promise<void> {
    const { siteId, deviceId, sensorKey, takenAt, sensorEnabled, historyNewestFirst } = params;

    if (!sensorEnabled) {
      await this.resolveHeuristicTypesForSiteSensor(executor, siteId, sensorKey);
      return;
    }

    const types = heuristicTypesForSensor(sensorKey);
    if (types.length === 0) {
      return;
    }

    const findings = evaluateHeuristicsForSensor(sensorKey, historyNewestFirst, takenAt);
    const byType = new Map<string, { severity: "warning" | "critical"; message: string }>();
    for (const f of findings) {
      const existing = byType.get(f.type);
      if (!existing || (f.severity === "critical" && existing.severity === "warning")) {
        byType.set(f.type, { severity: f.severity, message: f.message });
      }
    }

    for (const type of types) {
      const hit = byType.get(type);
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
      await this.resolveRangePairForSensor(executor, siteId, sensorKey);
      return;
    }

    const bounds = effectiveNormalBounds(physicalMin, physicalMax, threshold);
    if (!bounds) {
      await this.resolveRangePairForSensor(executor, siteId, sensorKey);
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

    const [warnType, violType] = this.rangeAlertTypes(sensorKey);
    const now = new Date();

    if (!decision) {
      await this.resolveRangePairForSensor(executor, siteId, sensorKey);
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
      .select(["device_id", "last_seen_at", "expected_interval_seconds"])
      .where("site_id", "=", siteId)
      .execute();

    const stale = devices.filter((d) =>
      isDeviceConsideredOffline(
        d.last_seen_at != null ? new Date(d.last_seen_at as Date | string) : null,
        d.expected_interval_seconds,
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

    const ids = stale.map((d) => d.device_id).sort();
    const message =
      stale.length === 1
        ? `Device ${ids[0]} has not reported within its offline threshold.`
        : `Devices offline (no recent telemetry): ${ids.join(", ")}.`;

    await this.upsertActiveAlert(executor, {
      siteId,
      deviceId: ids[0]!,
      type: "device_offline",
      severity: "critical",
      message
    });
  }

  /** Scheduler: every site that has at least one device. */
  async syncAllDeviceOfflineStates(nowMs: number = Date.now()): Promise<void> {
    const rows = await this.db.selectFrom("devices").select("site_id").distinct().execute();
    for (const { site_id } of rows) {
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

    const disabledBySite = await loadDisabledSensorsBySite(this.db, [siteId]);
    const filtered = filterAlertsForEnabledSensorsOnly(
      rows.map((r) => ({ site_id: siteId, type: r.type })),
      disabledBySite
    );
    return filtered.length > 0;
  }
}
