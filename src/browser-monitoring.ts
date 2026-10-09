import * as Sentry from "@sentry/nextjs";
import { clientEnv } from "@/env-client";
import { tracesSampleRate } from "@/observability";

export function startBrowserMonitoring(dsn: string, earlyErrors: unknown[]) {
  Sentry.init({
    dsn,
    environment: clientEnv.NEXT_PUBLIC_VERCEL_ENV ?? "development",
    tracesSampleRate,
  });
  earlyErrors.forEach((error) => Sentry.captureException(error));
  return Sentry.captureRouterTransitionStart;
}
