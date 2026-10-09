import { db } from "@/db/client";

export async function getCheckCount() {
  const rows = await db.query.healthChecks.findMany();
  return rows.length;
}
