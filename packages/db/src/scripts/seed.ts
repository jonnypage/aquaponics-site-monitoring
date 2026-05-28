import "dotenv/config";
import { getDb } from "./shared.js";
import { seedDemo } from "./seed-demo.js";
import { seedUsers } from "./seed-users.js";

async function main(): Promise<void> {
  const db = getDb();
  try {
    await seedUsers(db);
    await seedDemo(db);
    console.log("Seed complete (users + demo data)");
  } finally {
    await db.destroy();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
