import "dotenv/config";
import bcrypt from "bcryptjs";
import type { Kysely } from "kysely";
import type { Database, UserRole } from "../types.js";
import { getDb } from "./shared.js";
import {
  ADMIN_EMAIL,
  ADMIN_NAME,
  ADMIN_PASSWORD,
  VIEWER_EMAIL,
  VIEWER_NAME,
  VIEWER_PASSWORD,
  VIEWER_ROLE
} from "./seed-constants.js";

/** Insert seed users when missing. Does not update existing rows (passwords stay unchanged). */
async function ensureUser(
  db: Kysely<Database>,
  params: {
    email: string;
    name: string;
    password: string;
    role: UserRole;
  }
): Promise<{ id: string; created: boolean }> {
  const existing = await db
    .selectFrom("users")
    .select(["id"])
    .where("email", "=", params.email)
    .executeTakeFirst();

  if (existing) {
    return { id: existing.id, created: false };
  }

  const passwordHash = await bcrypt.hash(params.password, 12);
  const inserted = await db
    .insertInto("users")
    .values({
      email: params.email,
      name: params.name,
      password_hash: passwordHash,
      role: params.role
    })
    .returning(["id"])
    .executeTakeFirstOrThrow();

  return { id: inserted.id, created: true };
}

export async function seedUsers(db: Kysely<Database>): Promise<void> {
  const admin = await ensureUser(db, {
    email: ADMIN_EMAIL,
    name: ADMIN_NAME,
    password: ADMIN_PASSWORD,
    role: "admin"
  });

  const viewer = await ensureUser(db, {
    email: VIEWER_EMAIL,
    name: VIEWER_NAME,
    password: VIEWER_PASSWORD,
    role: VIEWER_ROLE
  });

  console.log("Seed users complete");
  if (admin.created) {
    console.log(`Admin created: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  } else {
    console.log(`Admin already exists: ${ADMIN_EMAIL} (password unchanged)`);
  }
  if (viewer.created) {
    console.log(`Viewer created: ${VIEWER_EMAIL} / ${VIEWER_PASSWORD}`);
  } else {
    console.log(`Viewer already exists: ${VIEWER_EMAIL} (password unchanged)`);
  }
}

async function main(): Promise<void> {
  const db = getDb();
  try {
    await seedUsers(db);
  } finally {
    await db.destroy();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
