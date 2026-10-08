import * as Sentry from "@sentry/nextjs";
import { clientEnv } from "@/env-client";
import { tracesSampleRate } from "@/observability";

Sentry.init({
  dsn: clientEnv.NEXT_PUBLIC_SENTRY_DSN,
  environment: clientEnv.NEXT_PUBLIC_VERCEL_ENV ?? "development",
  tracesSampleRate,
  enabled: Boolean(clientEnv.NEXT_PUBLIC_SENTRY_DSN),
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
