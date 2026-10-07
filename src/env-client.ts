import { z } from "zod";

const clientEnvSchema = z.object({
  NEXT_PUBLIC_SENTRY_DSN: z.url().optional(),
  NEXT_PUBLIC_VERCEL_ENV: z.enum(["production", "preview", "development"]).optional(),
});

export const clientEnv = clientEnvSchema.parse({
  NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN || undefined,
  NEXT_PUBLIC_VERCEL_ENV: process.env.NEXT_PUBLIC_VERCEL_ENV || undefined,
});
