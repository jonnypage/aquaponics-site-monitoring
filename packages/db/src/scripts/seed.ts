import "dotenv/config";
import bcrypt from "bcryptjs";
import { getDb } from "./shared.js";
import type { UserRole } from "../types.js";

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@local.dev";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "changeme-admin";
const ADMIN_NAME = process.env.SEED_ADMIN_NAME ?? "Seed Admin";

const VIEWER_EMAIL = process.env.SEED_VIEWER_EMAIL ?? "viewer@local.dev";
const VIEWER_PASSWORD = process.env.SEED_VIEWER_PASSWORD ?? "changeme-viewer";
const VIEWER_NAME = process.env.SEED_VIEWER_NAME ?? "Seed Viewer";
const VIEWER_ROLE: UserRole = "site_viewer";

const DEFAULT_SITE_NAME = process.env.SEED_SITE_NAME ?? "Demo Site";

async function upsertUser(params: {
  email: string;
  name: string;
  password: string;
  role: UserRole;
}) {
  const db = getDb();
  try {
    const passwordHash = await bcrypt.hash(params.password, 12);
    const existing = await db
      .selectFrom("users")
      .select(["id"])
      .where("email", "=", params.email)
      .executeTakeFirst();

    if (existing) {
      const updated = await db
        .updateTable("users")
        .set({
          name: params.name,
          password_hash: passwordHash,
          role: params.role
        })
        .where("id", "=", existing.id)
        .returning(["id"])
        .executeTakeFirstOrThrow();
      return updated.id;
    }

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

    return inserted.id;
  } finally {
    await db.destroy();
  }
}

async function main(): Promise<void> {
  const db = getDb();
  try {
    const site = await db
      .insertInto("sites")
      .values({ name: DEFAULT_SITE_NAME })
      .onConflict((oc) => oc.column("name").doUpdateSet({ name: DEFAULT_SITE_NAME }))
      .returning(["id", "name"])
      .executeTakeFirstOrThrow();

    const adminId = await upsertUser({
      email: ADMIN_EMAIL,
      name: ADMIN_NAME,
      password: ADMIN_PASSWORD,
      role: "admin"
    });

    const viewerId = await upsertUser({
      email: VIEWER_EMAIL,
      name: VIEWER_NAME,
      password: VIEWER_PASSWORD,
      role: VIEWER_ROLE
    });

    await db
      .insertInto("user_sites")
      .values({
        user_id: viewerId,
        site_id: site.id
      })
      .onConflict((oc) => oc.columns(["user_id", "site_id"]).doNothing())
      .execute();

    console.log("Seed complete");
    console.log(`Site: ${site.name}`);
    console.log(`Admin: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
    console.log(`Viewer: ${VIEWER_EMAIL} / ${VIEWER_PASSWORD}`);
  } finally {
    await db.destroy();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
