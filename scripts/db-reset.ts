import { env } from "@/env";
import { freshDatabase } from "./lib/database";

await freshDatabase(env.DATABASE_URL, { seed: true });
console.log("Database recreated, migrated and seeded.");
