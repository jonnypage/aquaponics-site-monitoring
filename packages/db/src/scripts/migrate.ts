import { getDb, getMigrator, logMigrationResults } from "./shared.js";

type MigrationCommand = "latest" | "down";

async function main(): Promise<void> {
  const command = (process.argv[2] as MigrationCommand | undefined) ?? "latest";
  const db = getDb();
  const migrator = getMigrator(db);

  try {
    if (command === "down") {
      const { results, error } = await migrator.migrateDown();
      await logMigrationResults(results ?? [], error);
      return;
    }

    const { results, error } = await migrator.migrateToLatest();
    await logMigrationResults(results ?? [], error);
  } finally {
    await db.destroy();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
