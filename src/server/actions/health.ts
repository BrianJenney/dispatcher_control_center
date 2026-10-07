"use server";

import { z } from "zod";
import { healthChecks } from "@/db/schema";
import { recordHealthCheckInput } from "@/domain/health-check";
import { defineAction } from "@/server/action";

export const recordHealthCheck = defineAction(recordHealthCheckInput, async (input, { tx, userId }) => {
  await tx.insert(healthChecks).values({ label: input.label, recordedBy: userId });
});

export const clearHealthChecks = defineAction(z.object({}), async (_input, { tx }) => {
  const cleared = await tx.delete(healthChecks).returning({ id: healthChecks.id });
  return { cleared: cleared.length };
});
