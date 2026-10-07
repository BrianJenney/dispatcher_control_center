import { migrate } from "drizzle-orm/node-postgres/migrator";
import type { Database } from "@/db/client";

export async function runMigrations(db: Database) {
  await migrate(db, { migrationsFolder: "src/db/migrations" });
}
