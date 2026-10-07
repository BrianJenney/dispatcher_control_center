import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url(),
  APP_TIMEZONE: z.string().default("America/New_York"),
  DEMO_USER_EMAIL: z.email().default("dispatcher@example.com"),
  DEMO_USER_PASSWORD: z.string().min(8),
  STORAGE_ENDPOINT: z.url(),
  STORAGE_BUCKET: z.string().min(1),
  STORAGE_ACCESS_KEY_ID: z.string().min(1),
  STORAGE_SECRET_ACCESS_KEY: z.string().min(1),
  SENTRY_DSN: z.url().optional(),
  VERCEL_ENV: z.enum(["production", "preview", "development"]).optional(),
});

export const env = envSchema.parse(process.env);
