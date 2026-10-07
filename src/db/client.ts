import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@/db/schema";
import { env } from "@/env";

export function createDatabase(connectionString: string) {
  const pool = new Pool({ connectionString, max: 5 });
  return { db: drizzle({ client: pool, schema }), pool };
}

export type Database = ReturnType<typeof createDatabase>["db"];
export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

declare global {
  var dispatchDatabase: ReturnType<typeof createDatabase> | undefined;
}

globalThis.dispatchDatabase ??= createDatabase(env.DATABASE_URL);

export const db = globalThis.dispatchDatabase.db;
