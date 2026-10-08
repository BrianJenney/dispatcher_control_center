"use server";

import * as Sentry from "@sentry/nextjs";
import { z } from "zod";
import { healthChecks } from "@/db/schema";
import { monitoringTestInput, recordHealthCheckInput } from "@/domain/health-check";
import { env } from "@/env";
import { defineAction } from "@/server/action";

export const recordHealthCheck = defineAction(recordHealthCheckInput, async (input, { tx, userId }) => {
  await tx.insert(healthChecks).values({ label: input.label, recordedBy: userId });
});

export const clearHealthChecks = defineAction(z.object({}), async (_input, { tx }) => {
  const cleared = await tx.delete(healthChecks).returning({ id: healthChecks.id });
  return { cleared: cleared.length };
});

export const sendMonitoringTest = defineAction(monitoringTestInput, async () => {
  if (!env.SENTRY_DSN) return { sent: false };
  await Sentry.startSpan({ name: "monitoring test", op: "test" }, async () => {
    await new Promise((resolve) => setTimeout(resolve, 120));
    Sentry.captureException(new Error("Test error sent from the system health page"));
  });
  await Sentry.flush(3000);
  return { sent: true };
});
