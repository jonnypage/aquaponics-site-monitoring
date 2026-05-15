import type { ColumnType, Generated, Insertable, Selectable, Updateable } from "kysely";

export type UserRole = "admin" | "site_manager" | "site_viewer";

type Timestamp = ColumnType<Date, Date | string | undefined, Date | string | undefined>;

export interface UsersTable {
  id: Generated<string>;
  email: string;
  name: string;
  password_hash: string;
  role: UserRole;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface SitesTable {
  id: Generated<string>;
  name: string;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface UserSitesTable {
  user_id: string;
  site_id: string;
  created_at: Timestamp;
}

export interface SensorCatalogTable {
  key: string;
  display_name: string;
  unit: string;
  physical_min: number | null;
  physical_max: number | null;
  sort_order: number;
  icon: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface DevicesTable {
  device_id: string;
  api_key_hash: string;
  site_id: string;
  last_seen_at: Timestamp | null;
  expected_interval_seconds: number;
  report_interval_seconds: number;
  snapshot_interval_seconds: number;
  has_camera: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface MeasurementsTable {
  taken_at: Timestamp;
  id: Generated<string>;
  site_id: string;
  device_id: string | null;
  sensor: string;
  value: number;
  ingested_at: Timestamp;
}

export interface SiteSensorCatalogTable {
  site_id: string;
  sensor: string;
  enabled: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface SensorThresholdsTable {
  site_id: string;
  sensor: string;
  normal_min: number | null;
  normal_max: number | null;
  warning_delta: number | null;
  critical_delta: number | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export type AlertSeverity = "warning" | "critical";
export type AlertStatus = "active" | "resolved";

export interface AlertsTable {
  id: Generated<string>;
  site_id: string;
  device_id: string | null;
  type: string;
  severity: AlertSeverity;
  status: AlertStatus;
  message: string;
  last_notified_at: Timestamp | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface Database {
  users: UsersTable;
  sites: SitesTable;
  user_sites: UserSitesTable;
  sensor_catalog: SensorCatalogTable;
  devices: DevicesTable;
  measurements: MeasurementsTable;
  site_sensor_catalog: SiteSensorCatalogTable;
  sensor_thresholds: SensorThresholdsTable;
  alerts: AlertsTable;
}

export type User = Selectable<UsersTable>;
export type NewUser = Insertable<UsersTable>;
export type UserUpdate = Updateable<UsersTable>;
