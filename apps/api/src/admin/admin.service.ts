import { createHash, randomBytes, randomUUID } from "node:crypto";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import type { Database, UserRole } from "@aquaponics/db";
import type { Kysely } from "kysely";
import { sql } from "kysely";
import bcrypt from "bcryptjs";
import { DB_TOKEN } from "../database/database.constants.js";
import { Role } from "../auth/auth.types.js";
import { IngestAlertService } from "../ingest/ingest-alert.service.js";
import { loadSiteSensorReporting } from "../sites/site-sensor-reporting.util.js";
import type {
  AdminDeviceModel,
  AdminSiteModel,
  AdminUserModel,
  CreateAdminDeviceInput,
  CreateAdminSiteInput,
  CreateAdminUserInput,
  CreateSensorCatalogEntryInput,
  SensorCatalogEntryModel,
  SiteSensorReportingInput,
  SiteSensorThresholdInput,
  UpdateAdminDeviceInput,
  UpdateAdminSiteInput,
  UpdateAdminUserInput,
  UpdateSensorCatalogEntryInput
} from "./admin.types.js";

function sha256Hex(plaintext: string): string {
  return createHash("sha256").update(plaintext, "utf8").digest("hex");
}

function gqlRoleToDb(role: Role): UserRole {
  return role as unknown as UserRole;
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
    private readonly ingestAlerts: IngestAlertService
  ) {}

  private mapCatalogRow(row: {
    key: string;
    display_name: string;
    unit: string;
    physical_min: number | null;
    physical_max: number | null;
    sort_order: number;
    icon: string | null;
    created_at: Date;
    updated_at: Date;
  }): SensorCatalogEntryModel {
    return {
      key: row.key,
      displayName: row.display_name,
      unit: row.unit,
      physicalMin: row.physical_min,
      physicalMax: row.physical_max,
      sortOrder: row.sort_order,
      icon: row.icon,
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

    const maxSort = await this.db
      .selectFrom("sensor_catalog")
      .select((eb) => eb.fn.max("sort_order").as("m"))
      .executeTakeFirst();
    const rawMax = maxSort?.m;
    const nextSort = rawMax != null ? Number(rawMax) + 1 : 0;
    const sortOrder = input.sortOrder ?? nextSort;

    const sites = await this.db.selectFrom("sites").select("id").execute();

    try {
      const row = await this.db
        .insertInto("sensor_catalog")
        .values({
          key,
          display_name: input.displayName.trim(),
          unit: input.unit.trim(),
          physical_min: input.physicalMin ?? null,
          physical_max: input.physicalMax ?? null,
          sort_order: sortOrder,
          icon: normalizeStoredLucideIcon(input.icon),
          updated_at: new Date()
        })
        .returningAll()
        .executeTakeFirstOrThrow();
      for (const s of sites) {
        await this.db
          .insertInto("site_sensor_catalog")
          .values({
            site_id: s.id,
            sensor: key,
            enabled: false,
            updated_at: new Date()
          })
          .onConflict((oc) => oc.columns(["site_id", "sensor"]).doNothing())
          .execute();
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

    const row = await this.db
      .updateTable("sensor_catalog")
      .set({
        display_name: input.displayName !== undefined ? input.displayName.trim() : existing.display_name,
        unit: input.unit !== undefined ? input.unit.trim() : existing.unit,
        physical_min: physicalMin,
        physical_max: physicalMax,
        sort_order: sortOrder,
        icon: input.icon !== undefined ? normalizeStoredLucideIcon(input.icon) : existing.icon,
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

  private validateReportingAndThresholds(
    catalogKeys: string[],
    reporting: SiteSensorReportingInput[],
    thresholds: SiteSensorThresholdInput[]
  ): void {
    const set = new Set(catalogKeys);
    const repKeys = new Set(reporting.map((r) => r.sensorKey));
    if (repKeys.size !== catalogKeys.length) {
      throw new BadRequestException("sensorReporting must include exactly one entry per catalog sensor");
    }
    for (const k of catalogKeys) {
      if (!repKeys.has(k)) {
        throw new BadRequestException(`Missing sensorReporting for key: ${k}`);
      }
    }
    for (const extra of repKeys) {
      if (!set.has(extra)) {
        throw new BadRequestException(`Unknown sensor key in sensorReporting: ${extra}`);
      }
    }
    const thKeys = new Set(thresholds.map((t) => t.sensorKey));
    for (const t of thresholds) {
      if (!set.has(t.sensorKey)) {
        throw new BadRequestException(`Unknown sensor key in sensorThresholds: ${t.sensorKey}`);
      }
      assertThresholdDeltas(t.warningDelta ?? null, t.criticalDelta ?? null);
    }
    for (const k of thKeys) {
      if (!set.has(k)) {
        throw new BadRequestException(`Invalid threshold sensorKey: ${k}`);
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
      .orderBy("sensor", "asc")
      .execute();
    const thByKey = new Map(thRows.map((r) => [r.sensor, r]));
    const sensorThresholds = sensorReporting.map(({ sensorKey: key }) => {
      const row = thByKey.get(key);
      return {
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
    const catalogKeys = (await this.db.selectFrom("sensor_catalog").select("key").orderBy("key", "asc").execute()).map(
      (r) => r.key
    );
    this.validateReportingAndThresholds(catalogKeys, input.sensorReporting, input.sensorThresholds);

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
      for (const key of catalogKeys) {
        const rep = input.sensorReporting.find((r) => r.sensorKey === key);
        await trx
          .insertInto("site_sensor_catalog")
          .values({
            site_id: id,
            sensor: key,
            enabled: rep?.enabled ?? false,
            updated_at: new Date()
          })
          .execute();
      }
      for (const t of input.sensorThresholds) {
        await trx
          .insertInto("sensor_thresholds")
          .values({
            site_id: id,
            sensor: t.sensorKey,
            normal_min: t.normalMin ?? null,
            normal_max: t.normalMax ?? null,
            warning_delta: t.warningDelta ?? null,
            critical_delta: t.criticalDelta ?? null,
            updated_at: new Date()
          })
          .execute();
      }
      if (input.attachDeviceId?.trim()) {
        const devId = input.attachDeviceId.trim();
        const dev = await trx.selectFrom("devices").select("device_id").where("device_id", "=", devId).executeTakeFirst();
        if (!dev) {
          throw new NotFoundException("Device not found");
        }
        await trx
          .updateTable("devices")
          .set({ site_id: id, updated_at: new Date() })
          .where("device_id", "=", devId)
          .execute();
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

    const catalogKeys = (await this.db.selectFrom("sensor_catalog").select("key").orderBy("key", "asc").execute()).map(
      (r) => r.key
    );
    if (input.sensorReporting != null && input.sensorThresholds != null) {
      this.validateReportingAndThresholds(catalogKeys, input.sensorReporting, input.sensorThresholds);
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
        await trx.deleteFrom("site_sensor_catalog").where("site_id", "=", input.id).execute();
        await trx.deleteFrom("sensor_thresholds").where("site_id", "=", input.id).execute();
        for (const key of catalogKeys) {
          const rep = input.sensorReporting.find((r) => r.sensorKey === key);
          await trx
            .insertInto("site_sensor_catalog")
            .values({
              site_id: input.id,
              sensor: key,
              enabled: rep?.enabled ?? false,
              updated_at: new Date()
            })
            .execute();
        }
        for (const t of input.sensorThresholds) {
          await trx
            .insertInto("sensor_thresholds")
            .values({
              site_id: input.id,
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
        const dev = await trx.selectFrom("devices").select("device_id").where("device_id", "=", devId).executeTakeFirst();
        if (!dev) {
          throw new NotFoundException("Device not found");
        }
        await trx
          .updateTable("devices")
          .set({ site_id: input.id, updated_at: new Date() })
          .where("device_id", "=", devId)
          .execute();
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
    const row = await this.db
      .insertInto("devices")
      .values({
        device_id: deviceId,
        api_key_hash: hash,
        name: this.normalizeDeviceName(input.name),
        site_id: siteId,
        expected_interval_seconds: input.expectedIntervalSeconds ?? 300,
        report_interval_seconds: input.reportIntervalSeconds ?? 900,
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

    const patch: {
      site_id: string | null;
      name?: string | null;
      expected_interval_seconds: number;
      report_interval_seconds: number;
      snapshot_interval_seconds: number;
      has_camera: boolean;
      updated_at: Date;
    } = {
      site_id: nextSiteId,
      expected_interval_seconds: input.expectedIntervalSeconds ?? existing.expected_interval_seconds,
      report_interval_seconds: input.reportIntervalSeconds ?? existing.report_interval_seconds,
      snapshot_interval_seconds: input.snapshotIntervalSeconds ?? existing.snapshot_interval_seconds,
      has_camera: input.hasCamera ?? existing.has_camera,
      updated_at: new Date()
    };
    if (input.name !== undefined) {
      patch.name = this.normalizeDeviceName(input.name);
    }

    const row = await this.db
      .updateTable("devices")
      .set(patch)
      .where("device_id", "=", input.deviceId)
      .returningAll()
      .executeTakeFirstOrThrow();

    if (existing.site_id && existing.site_id !== nextSiteId) {
      await this.ingestAlerts.syncDeviceOfflineStateForSite(this.db, existing.site_id);
    }
    if (nextSiteId && nextSiteId !== existing.site_id) {
      await this.ingestAlerts.syncDeviceOfflineStateForSite(this.db, nextSiteId);
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
}
