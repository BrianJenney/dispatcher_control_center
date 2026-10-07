import { createDatabase } from "@/db/client";
import { seed } from "@/db/seed";
import { env } from "@/env";

const { db, pool } = createDatabase(env.DATABASE_URL);
await seed(db, { demoUser: { email: env.DEMO_USER_EMAIL, password: env.DEMO_USER_PASSWORD } });
await pool.end();
console.log("Seeded.");
