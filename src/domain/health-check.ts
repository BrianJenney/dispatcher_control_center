import { z } from "zod";

export const recordHealthCheckInput = z.object({
  label: z
    .string()
    .trim()
    .min(1, "Give the check a short name.")
    .max(60, "Keep the name to 60 characters or fewer."),
});

export const monitoringTestInput = z.object({});

export const healthSnapshot = z.object({
  database: z.literal("ok"),
  errorReporting: z.boolean(),
  checkCount: z.number().int().nonnegative(),
  latestCheck: z
    .object({
      label: z.string(),
      recordedAt: z.iso.datetime(),
    })
    .nullable(),
});

export type HealthSnapshot = z.infer<typeof healthSnapshot>;

export function uptimeAnswer(databaseReachable: boolean) {
  return databaseReachable
    ? { status: 200, body: { database: "ok" } }
    : { status: 503, body: { database: "unreachable" } };
}
