import { z } from "zod";

export const recordHealthCheckInput = z.object({
  label: z
    .string()
    .trim()
    .min(1, "Give the check a short name.")
    .max(60, "Keep the name to 60 characters or fewer."),
});

export const healthSnapshot = z.object({
  database: z.literal("ok"),
  checkCount: z.number().int().nonnegative(),
  latestCheck: z
    .object({
      label: z.string(),
      recordedAt: z.iso.datetime(),
    })
    .nullable(),
});

export type HealthSnapshot = z.infer<typeof healthSnapshot>;
