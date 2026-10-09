import { db } from "@/db/client";
import { defineQuery } from "@/server/query";

export type CheckCount = number;

export const getCheckCount = defineQuery("signed-in", async (): Promise<CheckCount> => {
  const rows = await db.query.healthChecks.findMany();
  return rows.length;
});
