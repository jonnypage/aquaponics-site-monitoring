import "dotenv/config";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { FileMigrationProvider, Migrator, type MigrationResult } from "kysely";
import { createDb } from "../client.js";
import type { Database } from "../types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is required");
  }
  return url;
}

export function getDb() {
  return createDb(getDatabaseUrl());
}

export function getMigrator(db: ReturnType<typeof createDb>) {
  const migrationsPath = path.join(__dirname, "..", "migrations");

  return new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs,
      path,
      migrationFolder: migrationsPath
    })
  });
}

export async function logMigrationResults(
  results: ReadonlyArray<MigrationResult>,
  error: unknown
) {
  for (const it of results) {
    console.log(`${it.status}: ${it.migrationName}`);
  }

  if (error) {
    console.error("Migration error:", error);
    process.exitCode = 1;
  }
}

export type DB = Database;
