import { env } from "@/env";
import { freshDatabase } from "./lib/database";

await freshDatabase(env.DATABASE_URL, { seed: true, loadTrips: process.argv.includes("--load") ? 100_000 : 0 });
console.log("Database recreated, migrated and seeded.");
