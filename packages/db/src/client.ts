import { Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";
import type { Database } from "./types.js";

const DEFAULT_POOL_MAX = 10;
const MIN_POOL_MAX = 1;
const MAX_POOL_MAX = 32;

function clampPoolMax(value: number): number {
  return Math.min(MAX_POOL_MAX, Math.max(MIN_POOL_MAX, value));
}

function parsePoolMax(raw: string | undefined): number {
  if (!raw) {
    return DEFAULT_POOL_MAX;
  }
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed)) {
    return DEFAULT_POOL_MAX;
  }
  return clampPoolMax(parsed);
}

export function createDb(databaseUrl: string): Kysely<Database> {
  const poolMax = parsePoolMax(process.env.PG_POOL_MAX);
  const pool = new Pool({
    connectionString: databaseUrl,
    max: poolMax
  });

  return new Kysely<Database>({
    dialect: new PostgresDialect({ pool })
  });
}
