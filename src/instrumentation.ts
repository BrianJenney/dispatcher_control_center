import * as Sentry from "@sentry/nextjs";
import { env } from "@/env";
import { tracesSampleRate } from "@/observability";

export function register() {
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.VERCEL_ENV ?? "development",
    tracesSampleRate,
    enabled: Boolean(env.SENTRY_DSN),
  });
}

export const onRequestError = Sentry.captureRequestError;
