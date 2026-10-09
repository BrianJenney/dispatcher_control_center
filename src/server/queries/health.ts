import { count, desc, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { healthChecks } from "@/db/schema";
import type { HealthSnapshot } from "@/domain/health-check";
import { env } from "@/env";
import { defineQuery } from "@/server/query";

export const databaseReachable = defineQuery("public", async () => {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
});

export const getHealthSnapshot = defineQuery("signed-in", async (): Promise<HealthSnapshot> => {
  const [latest] = await db
    .select({ label: healthChecks.label, createdAt: healthChecks.createdAt })
    .from(healthChecks)
    .orderBy(desc(healthChecks.createdAt))
    .limit(1);
  const [totals] = await db.select({ checkCount: count() }).from(healthChecks);

  return {
    database: "ok",
    errorReporting: Boolean(env.SENTRY_DSN),
    checkCount: totals?.checkCount ?? 0,
    latestCheck: latest ? { label: latest.label, recordedAt: latest.createdAt.toISOString() } : null,
  };
});
