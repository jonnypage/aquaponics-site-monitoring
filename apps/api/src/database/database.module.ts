import { Inject, Injectable, Module, OnApplicationShutdown } from "@nestjs/common";
import { createDb, type Database } from "@aquaponics/db";
import type { Kysely } from "kysely";
import { DB_TOKEN } from "./database.constants.js";

@Injectable()
class DatabaseLifecycle implements OnApplicationShutdown {
  constructor(@Inject(DB_TOKEN) private readonly db: Kysely<Database>) {}

  async onApplicationShutdown(): Promise<void> {
    await this.db.destroy();
  }
}

@Module({
  providers: [
    {
      provide: DB_TOKEN,
      useFactory: () => {
        const databaseUrl = process.env.DATABASE_PUBLIC_URL;
        if (!databaseUrl) {
          throw new Error("DATABASE_PUBLIC_URL is required");
        }
        return createDb(databaseUrl);
      }
    },
    DatabaseLifecycle
  ],
  exports: [DB_TOKEN]
})
export class DatabaseModule {}
