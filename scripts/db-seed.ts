import { createDatabase } from "@/db/client";
import { seed } from "@/db/seed";
import { env } from "@/env";
import { seedOptions } from "./lib/database";

const loadTrips = process.argv.includes("--load") ? 100_000 : 0;
const { db, pool } = createDatabase(env.DATABASE_URL);
const started = Date.now();
const result = await seed(db, seedOptions(loadTrips));
await pool.end();
console.log(`Seeded ${String(result.trips)} trips in ${String(Math.round((Date.now() - started) / 1000))}s.`);
