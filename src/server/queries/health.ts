import { count, desc } from "drizzle-orm";
import { db } from "@/db/client";
import { healthChecks } from "@/db/schema";
import type { HealthSnapshot } from "@/domain/health-check";
import { env } from "@/env";

export async function getHealthSnapshot(): Promise<HealthSnapshot> {
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
}
