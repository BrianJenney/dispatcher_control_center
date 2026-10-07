import { createDatabase } from "@/db/client";
import { runMigrations } from "@/db/migrate";
import { env } from "@/env";

const { db, pool } = createDatabase(env.DATABASE_URL);
await runMigrations(db);
await pool.end();
console.log("Migrations applied.");
