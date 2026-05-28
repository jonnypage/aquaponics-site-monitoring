import { createHash, randomBytes, randomUUID } from "node:crypto";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import {
  DEFAULT_SENSOR_WIRING_TEMPLATE,
  isSensorType,
  normalizeSensorWiringTemplate,
  type Database,
  type DevicePinMap,
  type SensorWiringTemplate,
  type UserRole
} from "@aquaponics/db";
import type { Kysely } from "kysely";
import { sql } from "kysely";
import bcrypt from "bcryptjs";
import { DB_TOKEN } from "../database/database.constants.js";
import { Role } from "../auth/auth.types.js";
import { IngestAlertService } from "../ingest/ingest-alert.service.js";
import { SnapshotsService } from "../snapshots/snapshots.service.js";
import { loadSiteSensorReporting } from "../sites/site-sensor-reporting.util.js";
import {
  removeSiteSensorCatalogForDevice,
  syncSiteSensorCatalogForDevice
} from "../sites/site-sensor-sync.util.js";

const DEFAULT_TELEMETRY_INTERVAL_SECONDS = 300;

/** Keep expected + report intervals aligned — admins set one telemetry cadence. */
function syncedTelemetryIntervalFromInput(
  input: { reportIntervalSeconds?: number | null; expectedIntervalSeconds?: number | null },
  existingExpected: number,
  existingReport: number
): { expected: number; report: number } {
  const fromInput = input.reportIntervalSeconds ?? input.expectedIntervalSeconds;
  if (fromInput != null) {
    return { expected: fromInput, report: fromInput };
  }
  return { expected: existingExpected, report: existingReport };
}
import type {
  AdminDeviceModel,
  AdminSiteModel,
  AdminUserModel,
  CreateAdminDeviceInput,
  CreateAdminSiteInput,
  CreateAdminUserInput,
  ClearAdminSiteSnapshotsPayload,
  CreateSensorCatalogEntryInput,
  ResetAdminSiteMeasurementsPayload,
  SensorCatalogEntryModel,
  SiteSensorReportingInput,
  SiteSensorThresholdInput,
  UpdateAdminDeviceInput,
  UpdateAdminSiteInput,
  UpdateAdminUserInput,
  UpdateSensorCatalogEntryInput
} from "./admin.types.js";
import { normalizeDevicePinMap } from "./device-pin-map.util.js";
import type { SensorWiringTemplateInput } from "./sensor-wiring.graphql-types.js";
import { SensorType } from "../sensors/sensor-type.types.js";

function sha256Hex(plaintext: string): string {
  return createHash("sha256").update(plaintext, "utf8").digest("hex");
}

function gqlRoleToDb(role: Role): UserRole {
  switch (role) {
    case Role.ADMIN:
      return "admin";
    case Role.SITE_MANAGER:
      return "site_manager";
    case Role.SITE_VIEWER:
      return "site_viewer";
    default:
      throw new BadRequestException("Invalid role");
  }
}

function assertLatLngPair(lat: number | null | undefined, lng: number | null | undefined): void {
  const hasLat = lat != null && !Number.isNaN(lat);
  const hasLng = lng != null && !Number.isNaN(lng);
  if (hasLat !== hasLng) {
    throw new BadRequestException("latitude and longitude must both be set or both omitted");
  }
}

function assertThresholdDeltas(warningDelta: number | null | undefined, criticalDelta: number | null | undefined): void {
  if (warningDelta != null && criticalDelta != null && criticalDelta < warningDelta) {
    throw new BadRequestException("criticalDelta must be greater than or equal to warningDelta when both are set");
  }
}

function validatePhysicalBounds(min: number | null | undefined, max: number | null | undefined): void {
  if (min != null && max != null && max < min) {
    throw new BadRequestException("physicalMax must be greater than or equal to physicalMin when both are set");
  }
}

/** Normalize admin input to Lucide React export names (PascalCase). */
function normalizeStoredLucideIcon(raw: string | null | undefined): string | null {
  if (raw == null || !String(raw).trim()) {
    return null;
  }
  const t = String(raw).trim();
  if (/[-_\s]/.test(t)) {
    return t
      .split(/[-_\s]+/)
      .filter(Boolean)
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase())
      .join("");
  }
  if (t.length && t[0] === t[0].toLowerCase()) {
    return t.charAt(0).toUpperCase() + t.slice(1);
  }
  return t;
}

@Injectable()
export class AdminService {
  constructor(
    @Inject(DB_TOKEN) private readonly db: Kysely<Database>,
    private readonly ingestAlerts: IngestAlertService,
    private readonly snapshots: SnapshotsService
  ) {}

  private async requireAdminSite(siteId: string): Promise<void> {
    const site = await this.db.selectFrom("sites").select("id").where("id", "=", siteId).executeTakeFirst();
    if (!site) {
      throw new NotFoundException("Site not found");
    }
  }

  private parseWiringInput(input: SensorWiringTemplateInput | undefined): SensorWiringTemplate {
    if (!input) {
      return {
        ...DEFAULT_SENSOR_WIRING_TEMPLATE,
        wires: [...DEFAULT_SENSOR_WIRING_TEMPLATE.wires]
      };
    }
    try {
      return normalizeSensorWiringTemplate(input);
    } catch (e: unknown) {
      throw new BadRequestException(e instanceof Error ? e.message : "Invalid wiring template");
    }
  }

  private mapCatalogRow(row: {
    key: string;
    sensor_type: string;
    model: string;
    display_name: string;
    unit: string;
    physical_min: number | null;
    physical_max: number | null;
    sort_order: number;
    icon: string | null;
    wiring_template: SensorWiringTemplate;
    created_at: Date;
    updated_at: Date;
  }): SensorCatalogEntryModel {
    const wiring = normalizeSensorWiringTemplate(row.wiring_template);
    return {
      key: row.key,
      sensorType: row.sensor_type as SensorType,
      model: row.model,
      displayName: row.display_name,
      unit: row.unit,
      physicalMin: row.physical_min,
      physicalMax: row.physical_max,
      sortOrder: row.sort_order,
      icon: row.icon,
      wiringTemplate: {
        wires: wiring.wires.map((w) => ({
          id: w.id,
          label: w.label,
          color: w.color,
          required: w.required !== false
        })),
        allowExtraWires: wiring.allowExtraWires ?? false,
        maxExtraWires: wiring.maxExtraWires ?? 2
      },
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  private normalizeDeviceName(value: string | null | undefined): string | null {
    if (value == null) {
      return null;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private mapDeviceRow(row: {
    device_id: string;
    name: string | null;
    site_id: string | null;
    last_seen_at: Date | null;
    expected_interval_seconds: number;
    report_interval_seconds: number;
    snapshot_interval_seconds: number;
    has_camera: boolean;
    pin_map: DevicePinMap | null;
    created_at: Date;
    updated_at: Date;
  }): AdminDeviceModel {
    return {
      deviceId: row.device_id,
      name: row.name,
      siteId: row.site_id,
      lastSeenAt: row.last_seen_at ? new Date(row.last_seen_at) : null,
      expectedIntervalSeconds: row.expected_interval_seconds,
      reportIntervalSeconds: row.report_interval_seconds,
      snapshotIntervalSeconds: row.snapshot_interval_seconds,
      hasCamera: row.has_camera,
      pinMap: row.pin_map,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  async sensorCatalog(): Promise<SensorCatalogEntryModel[]> {
    const rows = await this.db
      .selectFrom("sensor_catalog")
      .selectAll()
      .orderBy("sort_order", "asc")
      .orderBy("key", "asc")
      .execute();
    return rows.map((r) => this.mapCatalogRow(r));
  }

  async createSensorCatalogEntry(input: CreateSensorCatalogEntryInput): Promise<SensorCatalogEntryModel> {
    const key = input.key.trim();
    if (!key) {
      throw new BadRequestException("Sensor key is required");
    }
    validatePhysicalBounds(input.physicalMin, input.physicalMax);
    if (!isSensorType(input.sensorType)) {
      throw new BadRequestException("Invalid sensorType");
    }

    const maxSort = await this.db
      .selectFrom("sensor_catalog")
      .select((eb) => eb.fn.max("sort_order").as("m"))
      .executeTakeFirst();
    const rawMax = maxSort?.m;
    const nextSort = rawMax != null ? Number(rawMax) + 1 : 0;
    const sortOrder = input.sortOrder ?? nextSort;

    const sites = await this.db.selectFrom("sites").select("id").execute();
    const wiringTemplate = this.parseWiringInput(input.wiringTemplate);

    try {
      const row = await this.db
        .insertInto("sensor_catalog")
        .values({
          key,
          sensor_type: input.sensorType,
          model: input.model.trim(),
          display_name: input.displayName.trim(),
          unit: input.unit.trim(),
          physical_min: input.physicalMin ?? null,
          physical_max: input.physicalMax ?? null,
          sort_order: sortOrder,
          icon: normalizeStoredLucideIcon(input.icon),
          wiring_template: wiringTemplate,
          updated_at: new Date()
        })
        .returningAll()
        .executeTakeFirstOrThrow();
      for (const s of sites) {
        const siteDevices = await this.db
          .selectFrom("devices")
          .select(["device_id", "pin_map"])
          .where("site_id", "=", s.id)
          .execute();
        for (const device of siteDevices) {
          await syncSiteSensorCatalogForDevice(this.db, s.id, device.device_id, device.pin_map);
        }
      }
      return this.mapCatalogRow(row);
    } catch (e: unknown) {
      const err = e as { code?: string };
      if (err.code === "23505") {
        throw new ConflictException("A sensor with this key already exists");
      }
      throw e;
    }
  }

  async updateSensorCatalogEntry(input: UpdateSensorCatalogEntryInput): Promise<SensorCatalogEntryModel> {
    const existing = await this.db
      .selectFrom("sensor_catalog")
      .selectAll()
      .where("key", "=", input.key)
      .executeTakeFirst();
    if (!existing) {
      throw new NotFoundException("Sensor catalog entry not found");
    }

    const physicalMin =
      input.physicalMin !== undefined
        ? input.physicalMin === null
          ? null
          : input.physicalMin
        : existing.physical_min;
    const physicalMax =
      input.physicalMax !== undefined
        ? input.physicalMax === null
          ? null
          : input.physicalMax
        : existing.physical_max;
    validatePhysicalBounds(physicalMin, physicalMax);

    const sortOrder =
      input.sortOrder !== undefined && input.sortOrder !== null ? input.sortOrder : existing.sort_order;
    const wiringTemplate =
      input.wiringTemplate !== undefined
        ? this.parseWiringInput(input.wiringTemplate)
        : normalizeSensorWiringTemplate(existing.wiring_template);

    const row = await this.db
      .updateTable("sensor_catalog")
      .set({
        model: input.model !== undefined ? input.model.trim() : existing.model,
        display_name: input.displayName !== undefined ? input.displayName.trim() : existing.display_name,
        unit: input.unit !== undefined ? input.unit.trim() : existing.unit,
        physical_min: physicalMin,
        physical_max: physicalMax,
        sort_order: sortOrder,
        icon: input.icon !== undefined ? normalizeStoredLucideIcon(input.icon) : existing.icon,
        wiring_template: wiringTemplate,
        updated_at: new Date()
      })
      .where("key", "=", input.key)
      .returningAll()
      .executeTakeFirstOrThrow();
    return this.mapCatalogRow(row);
  }

  async deleteSensorCatalogEntry(key: string): Promise<boolean> {
    const k = key.trim();
    const m = await this.db
      .selectFrom("measurements")
      .select(sql<number>`cast(count(*) as int)`.as("c"))
      .where("sensor", "=", k)
      .executeTakeFirst();
    const count = Number(m?.c ?? 0);
    if (count > 0) {
      throw new BadRequestException("Cannot delete sensor key that has measurements");
    }
    const del = await this.db.deleteFrom("sensor_catalog").where("key", "=", k).executeTakeFirst();
    if (del.numDeletedRows === 0n) {
      throw new NotFoundException("Sensor catalog entry not found");
    }
    return true;
  }

  private async countAdminsExcludingUserId(excludeUserId?: string): Promise<number> {
    let q = this.db.selectFrom("users").select("id").where("role", "=", "admin");
    if (excludeUserId) {
      q = q.where("id", "!=", excludeUserId);
    }
    const rows = await q.execute();
    return rows.length;
  }

  private async assertCanDemoteAdmin(userId: string, newRole: UserRole): Promise<void> {
    if (newRole === "admin") {
      return;
    }
    const current = await this.db.selectFrom("users").select("role").where("id", "=", userId).executeTakeFirst();
    if (current?.role !== "admin") {
      return;
    }
    const others = await this.countAdminsExcludingUserId(userId);
    if (others < 1) {
      throw new ForbiddenException("Cannot remove the last admin user");
    }
  }

  async adminUsers(): Promise<AdminUserModel[]> {
    const users = await this.db.selectFrom("users").selectAll().orderBy("created_at", "asc").execute();
    if (users.length === 0) {
      return [];
    }
    const userIds = users.map((u) => u.id);
    const links = await this.db
      .selectFrom("user_sites")
      .select(["user_id", "site_id"])
      .where("user_id", "in", userIds)
      .execute();
    const byUser = new Map<string, string[]>();
    for (const l of links) {
      const arr = byUser.get(l.user_id) ?? [];
      arr.push(l.site_id);
      byUser.set(l.user_id, arr);
    }
    return users.map((user) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as Role,
      createdAt: new Date(user.created_at),
      updatedAt: new Date(user.updated_at),
      assignedSiteIds: byUser.get(user.id) ?? []
    }));
  }

  async createAdminUser(input: CreateAdminUserInput): Promise<AdminUserModel> {
    const email = input.email.toLowerCase().trim();
    const passwordHash = await bcrypt.hash(input.password, 12);
    const role = gqlRoleToDb(input.role);

    const created = await this.db.transaction().execute(async (trx) => {
      try {
        const user = await trx
          .insertInto("users")
          .values({
            email,
            name: input.name.trim(),
            password_hash: passwordHash,
            role,
            updated_at: new Date()
          })
          .returningAll()
          .executeTakeFirstOrThrow();
        if (input.assignedSiteIds.length > 0) {
          const sites = await trx.selectFrom("sites").select("id").where("id", "in", input.assignedSiteIds).execute();
          if (sites.length !== input.assignedSiteIds.length) {
            throw new BadRequestException("One or more assigned site IDs are invalid");
          }
          for (const siteId of input.assignedSiteIds) {
            await trx
              .insertInto("user_sites")
              .values({ user_id: user.id, site_id: siteId })
              .onConflict((oc) => oc.columns(["user_id", "site_id"]).doNothing())
              .execute();
          }
        }
        return user;
      } catch (e: unknown) {
        const err = e as { code?: string };
        if (err.code === "23505") {
          throw new ConflictException("Email already in use");
        }
        throw e;
      }
    });

    return (await this.adminUsers()).find((u) => u.id === created.id) ?? {
      id: created.id,
      email: created.email,
      name: created.name,
      role: created.role as Role,
      createdAt: new Date(created.created_at),
      updatedAt: new Date(created.updated_at),
      assignedSiteIds: input.assignedSiteIds
    };
  }

  async updateAdminUser(input: UpdateAdminUserInput): Promise<AdminUserModel> {
    const existing = await this.db.selectFrom("users").selectAll().where("id", "=", input.id).executeTakeFirst();
    if (!existing) {
      throw new NotFoundException("User not found");
    }

    if (input.role != null) {
      await this.assertCanDemoteAdmin(input.id, gqlRoleToDb(input.role));
    }

    const email = input.email?.toLowerCase().trim();
    if (email && email !== existing.email) {
      const clash = await this.db.selectFrom("users").select("id").where("email", "=", email).executeTakeFirst();
      if (clash) {
        throw new ConflictException("Email already in use");
      }
    }

    await this.db.transaction().execute(async (trx) => {
      await trx
        .updateTable("users")
        .set({
          email: email ?? existing.email,
          name: input.name !== undefined ? input.name.trim() : existing.name,
          role: input.role != null ? gqlRoleToDb(input.role) : existing.role,
          updated_at: new Date()
        })
        .where("id", "=", input.id)
        .execute();

      if (input.assignedSiteIds != null) {
        await trx.deleteFrom("user_sites").where("user_id", "=", input.id).execute();
        if (input.assignedSiteIds.length > 0) {
          const sites = await trx.selectFrom("sites").select("id").where("id", "in", input.assignedSiteIds).execute();
          if (sites.length !== input.assignedSiteIds.length) {
            throw new BadRequestException("One or more assigned site IDs are invalid");
          }
          for (const siteId of input.assignedSiteIds) {
            await trx.insertInto("user_sites").values({ user_id: input.id, site_id: siteId }).execute();
          }
        }
      }
    });

    const list = await this.adminUsers();
    const u = list.find((x) => x.id === input.id);
    if (!u) {
      throw new NotFoundException("User not found");
    }
    return u;
  }

  async resetAdminUserPassword(id: string, newPassword: string): Promise<boolean> {
    if (newPassword.length < 8) {
      throw new BadRequestException("Password must be at least 8 characters");
    }
    const passwordHash = await bcrypt.hash(newPassword, 12);
    const r = await this.db
      .updateTable("users")
      .set({ password_hash: passwordHash, updated_at: new Date() })
      .where("id", "=", id)
      .executeTakeFirst();
    if (r.numUpdatedRows === 0n) {
      throw new NotFoundException("User not found");
    }
    return true;
  }

  private instanceKey(deviceId: string, sensorKey: string): string {
    return `${deviceId}:${sensorKey}`;
  }

  private async validateReportingAndThresholds(
    siteId: string,
    reporting: SiteSensorReportingInput[],
    thresholds: SiteSensorThresholdInput[]
  ): Promise<void> {
    const catalogKeys = new Set(
      (await this.db.selectFrom("sensor_catalog").select("key").execute()).map((r) => r.key)
    );
    const siteDevices = await this.db
      .selectFrom("devices")
      .select(["device_id", "pin_map"])
      .where("site_id", "=", siteId)
      .execute();
    const deviceById = new Map(siteDevices.map((d) => [d.device_id, d]));
    const allowedInstances = new Set<string>();
    for (const device of siteDevices) {
      const pinMap = device.pin_map;
      const wired =
        pinMap != null && typeof pinMap === "object"
          ? Object.entries(pinMap as DevicePinMap)
              .filter(([, roles]) => roles != null && Object.keys(roles).length > 0)
              .map(([key]) => key)
          : [];
      for (const sensorKey of wired) {
        allowedInstances.add(this.instanceKey(device.device_id, sensorKey));
      }
    }

    const repKeys = new Set(reporting.map((r) => this.instanceKey(r.deviceId, r.sensorKey)));
    for (const r of reporting) {
      if (!deviceById.has(r.deviceId)) {
        throw new BadRequestException(`Device ${r.deviceId} is not assigned to this site`);
      }
      if (!catalogKeys.has(r.sensorKey)) {
        throw new BadRequestException(`Unknown sensor key in sensorReporting: ${r.sensorKey}`);
      }
      const key = this.instanceKey(r.deviceId, r.sensorKey);
      if (!allowedInstances.has(key)) {
        throw new BadRequestException(`Sensor ${r.sensorKey} is not wired on device ${r.deviceId}`);
      }
    }

    for (const t of thresholds) {
      if (!deviceById.has(t.deviceId)) {
        throw new BadRequestException(`Device ${t.deviceId} is not assigned to this site`);
      }
      if (!catalogKeys.has(t.sensorKey)) {
        throw new BadRequestException(`Unknown sensor key in sensorThresholds: ${t.sensorKey}`);
      }
      const key = this.instanceKey(t.deviceId, t.sensorKey);
      if (!allowedInstances.has(key)) {
        throw new BadRequestException(`Sensor ${t.sensorKey} is not wired on device ${t.deviceId}`);
      }
      assertThresholdDeltas(t.warningDelta ?? null, t.criticalDelta ?? null);
    }

    for (const key of allowedInstances) {
      if (!repKeys.has(key)) {
        throw new BadRequestException(`Missing sensorReporting for ${key}`);
      }
    }
  }

  private async loadAdminSite(siteId: string): Promise<AdminSiteModel | null> {
    const site = await this.db.selectFrom("sites").selectAll().where("id", "=", siteId).executeTakeFirst();
    if (!site) {
      return null;
    }
    const sensorReporting = await loadSiteSensorReporting(this.db, siteId);
    const thRows = await this.db
      .selectFrom("sensor_thresholds")
      .selectAll()
      .where("site_id", "=", siteId)
      .orderBy("device_id", "asc")
      .orderBy("sensor", "asc")
      .execute();
    const thByInstance = new Map(thRows.map((r) => [this.instanceKey(r.device_id, r.sensor), r]));
    const sensorThresholds = sensorReporting.map(({ deviceId, sensorKey: key }) => {
      const row = thByInstance.get(this.instanceKey(deviceId, key));
      return {
        deviceId,
        sensorKey: key,
        normalMin: row?.normal_min ?? null,
        normalMax: row?.normal_max ?? null,
        warningDelta: row?.warning_delta ?? null,
        criticalDelta: row?.critical_delta ?? null
      };
    });
    return {
      id: site.id,
      name: site.name,
      latitude: site.latitude ?? null,
      longitude: site.longitude ?? null,
      sensorReporting,
      sensorThresholds
    };
  }

  async adminSites(): Promise<AdminSiteModel[]> {
    const sites = await this.db.selectFrom("sites").selectAll().orderBy("name", "asc").execute();
    const out: AdminSiteModel[] = [];
    for (const s of sites) {
      const m = await this.loadAdminSite(s.id);
      if (m) {
        out.push(m);
      }
    }
    return out;
  }

  async createAdminSite(input: CreateAdminSiteInput): Promise<AdminSiteModel> {
    assertLatLngPair(input.latitude, input.longitude);
    const reporting = input.sensorReporting ?? [];
    const thresholds = input.sensorThresholds ?? [];

    const siteId = await this.db.transaction().execute(async (trx) => {
      let site;
      try {
        site = await trx
          .insertInto("sites")
          .values({
            name: input.name.trim(),
            latitude: input.latitude ?? null,
            longitude: input.longitude ?? null,
            updated_at: new Date()
          })
          .returning("id")
          .executeTakeFirstOrThrow();
      } catch (e: unknown) {
        const err = e as { code?: string };
        if (err.code === "23505") {
          throw new ConflictException("A site with this name already exists");
        }
        throw e;
      }
      const id = site.id;
      if (input.attachDeviceId?.trim()) {
        const devId = input.attachDeviceId.trim();
        const dev = await trx
          .selectFrom("devices")
          .select(["device_id", "pin_map"])
          .where("device_id", "=", devId)
          .executeTakeFirst();
        if (!dev) {
          throw new NotFoundException("Device not found");
        }
        await trx
          .updateTable("devices")
          .set({ site_id: id, updated_at: new Date() })
          .where("device_id", "=", devId)
          .execute();
        await syncSiteSensorCatalogForDevice(trx, id, devId, dev.pin_map);
      }

      if (reporting.length > 0 || thresholds.length > 0) {
        await this.validateReportingAndThresholds(id, reporting, thresholds);
        for (const rep of reporting) {
          await trx
            .updateTable("site_sensor_catalog")
            .set({ enabled: rep.enabled, updated_at: new Date() })
            .where("site_id", "=", id)
            .where("device_id", "=", rep.deviceId)
            .where("sensor", "=", rep.sensorKey)
            .execute();
        }
        for (const t of thresholds) {
          await trx
            .insertInto("sensor_thresholds")
            .values({
              site_id: id,
              device_id: t.deviceId,
              sensor: t.sensorKey,
              normal_min: t.normalMin ?? null,
              normal_max: t.normalMax ?? null,
              warning_delta: t.warningDelta ?? null,
              critical_delta: t.criticalDelta ?? null,
              updated_at: new Date()
            })
            .onConflict((oc) =>
              oc.columns(["site_id", "device_id", "sensor"]).doUpdateSet({
                normal_min: t.normalMin ?? null,
                normal_max: t.normalMax ?? null,
                warning_delta: t.warningDelta ?? null,
                critical_delta: t.criticalDelta ?? null,
                updated_at: new Date()
              })
            )
            .execute();
        }
      }
      return id;
    });

    const model = await this.loadAdminSite(siteId);
    if (!model) {
      throw new NotFoundException("Site not found after create");
    }
    return model;
  }

  async updateAdminSite(input: UpdateAdminSiteInput): Promise<AdminSiteModel> {
    const existing = await this.db.selectFrom("sites").selectAll().where("id", "=", input.id).executeTakeFirst();
    if (!existing) {
      throw new NotFoundException("Site not found");
    }

    const lat = input.latitude !== undefined ? input.latitude : existing.latitude;
    const lng = input.longitude !== undefined ? input.longitude : existing.longitude;
    assertLatLngPair(lat, lng);

    if (input.sensorReporting != null && input.sensorThresholds != null) {
      await this.validateReportingAndThresholds(input.id, input.sensorReporting, input.sensorThresholds);
    } else if (input.sensorReporting != null || input.sensorThresholds != null) {
      throw new BadRequestException("Update both sensorReporting and sensorThresholds together, or neither");
    }

    await this.db.transaction().execute(async (trx) => {
      const name = input.name !== undefined ? input.name.trim() : existing.name;
      try {
        await trx
          .updateTable("sites")
          .set({
            name,
            latitude: lat ?? null,
            longitude: lng ?? null,
            updated_at: new Date()
          })
          .where("id", "=", input.id)
          .execute();
      } catch (e: unknown) {
        const err = e as { code?: string };
        if (err.code === "23505") {
          throw new ConflictException("A site with this name already exists");
        }
        throw e;
      }

      if (input.sensorReporting != null && input.sensorThresholds != null) {
        await trx.deleteFrom("sensor_thresholds").where("site_id", "=", input.id).execute();
        for (const rep of input.sensorReporting) {
          await trx
            .updateTable("site_sensor_catalog")
            .set({ enabled: rep.enabled, updated_at: new Date() })
            .where("site_id", "=", input.id)
            .where("device_id", "=", rep.deviceId)
            .where("sensor", "=", rep.sensorKey)
            .execute();
        }
        for (const t of input.sensorThresholds) {
          await trx
            .insertInto("sensor_thresholds")
            .values({
              site_id: input.id,
              device_id: t.deviceId,
              sensor: t.sensorKey,
              normal_min: t.normalMin ?? null,
              normal_max: t.normalMax ?? null,
              warning_delta: t.warningDelta ?? null,
              critical_delta: t.criticalDelta ?? null,
              updated_at: new Date()
            })
            .execute();
        }
      }

      if (input.attachDeviceId?.trim()) {
        const devId = input.attachDeviceId.trim();
        const dev = await trx
          .selectFrom("devices")
          .select(["device_id", "pin_map"])
          .where("device_id", "=", devId)
          .executeTakeFirst();
        if (!dev) {
          throw new NotFoundException("Device not found");
        }
        await trx
          .updateTable("devices")
          .set({ site_id: input.id, updated_at: new Date() })
          .where("device_id", "=", devId)
          .execute();
        await syncSiteSensorCatalogForDevice(trx, input.id, devId, dev.pin_map);
      }
    });

    const model = await this.loadAdminSite(input.id);
    if (!model) {
      throw new NotFoundException("Site not found");
    }
    return model;
  }

  async adminDevices(siteId?: string): Promise<AdminDeviceModel[]> {
    let q = this.db.selectFrom("devices").selectAll().orderBy("device_id", "asc");
    if (siteId) {
      q = q.where("site_id", "=", siteId);
    }
    const rows = await q.execute();
    return rows.map((r) => this.mapDeviceRow(r));
  }

  async adminDevice(id: string): Promise<AdminDeviceModel> {
    const row = await this.db.selectFrom("devices").selectAll().where("device_id", "=", id).executeTakeFirst();
    if (!row) {
      throw new NotFoundException("Device not found");
    }
    return this.mapDeviceRow(row);
  }

  async createAdminDevice(input: CreateAdminDeviceInput): Promise<{ device: AdminDeviceModel; plainApiKey: string }> {
    const siteId = input.siteId?.trim() ? input.siteId.trim() : null;
    if (siteId) {
      const site = await this.db.selectFrom("sites").select("id").where("id", "=", siteId).executeTakeFirst();
      if (!site) {
        throw new NotFoundException("Site not found");
      }
    }
    const deviceId = randomUUID();
    const plainApiKey = `aq_${randomBytes(24).toString("base64url")}`;
    const hash = sha256Hex(plainApiKey);
    const telemetryIntervalSeconds =
      input.reportIntervalSeconds ??
      input.expectedIntervalSeconds ??
      DEFAULT_TELEMETRY_INTERVAL_SECONDS;
    const row = await this.db
      .insertInto("devices")
      .values({
        device_id: deviceId,
        api_key_hash: hash,
        name: this.normalizeDeviceName(input.name),
        site_id: siteId,
        expected_interval_seconds: telemetryIntervalSeconds,
        report_interval_seconds: telemetryIntervalSeconds,
        snapshot_interval_seconds: input.snapshotIntervalSeconds ?? 1800,
        has_camera: input.hasCamera ?? false,
        updated_at: new Date()
      })
      .returningAll()
      .executeTakeFirstOrThrow();
    return { device: this.mapDeviceRow(row), plainApiKey };
  }

  async updateAdminDevice(input: UpdateAdminDeviceInput): Promise<AdminDeviceModel> {
    const existing = await this.db.selectFrom("devices").selectAll().where("device_id", "=", input.deviceId).executeTakeFirst();
    if (!existing) {
      throw new NotFoundException("Device not found");
    }
    let nextSiteId: string | null = existing.site_id;
    if (input.siteId !== undefined) {
      if (input.siteId === null) {
        nextSiteId = null;
      } else {
        const trimmed = input.siteId.trim();
        if (trimmed === "") {
          nextSiteId = null;
        } else {
          const site = await this.db.selectFrom("sites").select("id").where("id", "=", trimmed).executeTakeFirst();
          if (!site) {
            throw new NotFoundException("Site not found");
          }
          nextSiteId = trimmed;
        }
      }
    }

    const telemetryInterval = syncedTelemetryIntervalFromInput(
      input,
      existing.expected_interval_seconds,
      existing.report_interval_seconds
    );
    const patch: {
      site_id: string | null;
      name?: string | null;
      pin_map?: DevicePinMap | null;
      expected_interval_seconds: number;
      report_interval_seconds: number;
      snapshot_interval_seconds: number;
      has_camera: boolean;
      updated_at: Date;
    } = {
      site_id: nextSiteId,
      expected_interval_seconds: telemetryInterval.expected,
      report_interval_seconds: telemetryInterval.report,
      snapshot_interval_seconds: input.snapshotIntervalSeconds ?? existing.snapshot_interval_seconds,
      has_camera: input.hasCamera ?? existing.has_camera,
      updated_at: new Date()
    };
    if (input.name !== undefined) {
      patch.name = this.normalizeDeviceName(input.name);
    }
    if (input.pinMap !== undefined) {
      patch.pin_map = input.pinMap === null ? null : normalizeDevicePinMap(input.pinMap);
    }

    const row = await this.db
      .updateTable("devices")
      .set(patch)
      .where("device_id", "=", input.deviceId)
      .returningAll()
      .executeTakeFirstOrThrow();

    if (existing.site_id && existing.site_id !== nextSiteId) {
      await removeSiteSensorCatalogForDevice(this.db, existing.site_id, input.deviceId);
      await this.ingestAlerts.syncDeviceOfflineStateForSite(this.db, existing.site_id);
    }

    const siteChanged = existing.site_id !== nextSiteId;
    const pinMapChanged = input.pinMap !== undefined;
    if (nextSiteId && (siteChanged || pinMapChanged)) {
      await syncSiteSensorCatalogForDevice(this.db, nextSiteId, input.deviceId, row.pin_map);
      if (siteChanged) {
        await this.ingestAlerts.syncDeviceOfflineStateForSite(this.db, nextSiteId);
      }
    }

    return this.mapDeviceRow(row);
  }

  async rotateAdminDeviceApiKey(deviceId: string): Promise<{ plainApiKey: string }> {
    const existing = await this.db.selectFrom("devices").selectAll().where("device_id", "=", deviceId).executeTakeFirst();
    if (!existing) {
      throw new NotFoundException("Device not found");
    }
    const plainApiKey = `aq_${randomBytes(24).toString("base64url")}`;
    const hash = sha256Hex(plainApiKey);
    await this.db
      .updateTable("devices")
      .set({ api_key_hash: hash, updated_at: new Date() })
      .where("device_id", "=", deviceId)
      .execute();
    return { plainApiKey };
  }

  async deleteAdminDevice(deviceId: string): Promise<boolean> {
    const r = await this.db.deleteFrom("devices").where("device_id", "=", deviceId).executeTakeFirst();
    if (r.numDeletedRows === 0n) {
      throw new NotFoundException("Device not found");
    }
    return true;
  }

  async deleteAdminSite(siteId: string): Promise<boolean> {
    await this.requireAdminSite(siteId);

    await this.snapshots.clearSiteSnapshots(siteId);

    await this.db
      .updateTable("devices")
      .set({ site_id: null, updated_at: new Date() })
      .where("site_id", "=", siteId)
      .execute();

    const r = await this.db.deleteFrom("sites").where("id", "=", siteId).executeTakeFirst();
    if (r.numDeletedRows === 0n) {
      throw new NotFoundException("Site not found");
    }
    return true;
  }

  async resetAdminSiteMeasurements(siteId: string): Promise<ResetAdminSiteMeasurementsPayload> {
    await this.requireAdminSite(siteId);
    const now = new Date();

    const del = await this.db
      .deleteFrom("measurements")
      .where("site_id", "=", siteId)
      .executeTakeFirst();

    const resolved = await this.db
      .updateTable("alerts")
      .set({ status: "resolved", updated_at: now })
      .where("site_id", "=", siteId)
      .where("status", "=", "active")
      .executeTakeFirst();

    return {
      siteId,
      deletedMeasurements: Number(del.numDeletedRows ?? 0n),
      resolvedAlerts: Number(resolved.numUpdatedRows ?? 0n)
    };
  }

  async clearAdminSiteSnapshots(siteId: string): Promise<ClearAdminSiteSnapshotsPayload> {
    await this.requireAdminSite(siteId);
    const result = await this.snapshots.clearSiteSnapshots(siteId);
    return {
      siteId,
      deletedSnapshots: result.deletedSnapshots,
      deletedStorageObjects: result.deletedStorageObjects,
      storageSkipped: result.storageSkipped
    };
  }
}
