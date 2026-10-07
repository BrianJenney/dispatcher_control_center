import * as Sentry from "@sentry/nextjs";
import { env } from "@/env";

export function register() {
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.VERCEL_ENV ?? "development",
    tracesSampleRate: 0.2,
    enabled: Boolean(env.SENTRY_DSN),
  });
}

export const onRequestError = Sentry.captureRequestError;
