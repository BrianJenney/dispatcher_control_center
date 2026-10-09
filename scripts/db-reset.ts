import { env } from "@/env";
import { freshDatabase, loadTripCount } from "./lib/database";

await freshDatabase(env.DATABASE_URL, { seed: true, loadTrips: process.argv.includes("--load") ? loadTripCount : 0 });
console.log("Database recreated, migrated and seeded.");
