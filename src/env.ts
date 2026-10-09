import { z } from "zod";
import { appOrigins } from "@/domain/auth";

const optionalUrl = z
  .union([z.url(), z.literal("")])
  .optional()
  .transform((value) => value || undefined);

const envSchema = z.object({
  DATABASE_URL: z.url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: optionalUrl,
  APP_TIMEZONE: z.string().default("America/New_York"),
  STORAGE_ENDPOINT: z.url(),
  STORAGE_BUCKET: z.string().min(1),
  STORAGE_ACCESS_KEY_ID: z.string().min(1),
  STORAGE_SECRET_ACCESS_KEY: z.string().min(1),
  SENTRY_DSN: optionalUrl,
  VERCEL_ENV: z.enum(["production", "preview", "development"]).optional(),
  VERCEL_URL: z.string().min(1).optional(),
  VERCEL_BRANCH_URL: z.string().min(1).optional(),
});

export const env = envSchema.transform((values, context) => {
  const origins = appOrigins({ configured: values.BETTER_AUTH_URL, deployment: values.VERCEL_URL, branch: values.VERCEL_BRANCH_URL });
  if (!origins.baseUrl) {
    context.addIssue({ code: "custom", path: ["BETTER_AUTH_URL"], message: "Set BETTER_AUTH_URL to the address people use for this app." });
    return z.NEVER;
  }
  return { ...values, BETTER_AUTH_URL: origins.baseUrl, TRUSTED_ORIGINS: origins.trusted };
}).parse(process.env);
