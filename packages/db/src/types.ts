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

export interface Database {
  users: UsersTable;
  sites: SitesTable;
  user_sites: UserSitesTable;
}

export type User = Selectable<UsersTable>;
export type NewUser = Insertable<UsersTable>;
export type UserUpdate = Updateable<UsersTable>;
