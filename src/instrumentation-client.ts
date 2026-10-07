import * as Sentry from "@sentry/nextjs";
import { clientEnv } from "@/env-client";

Sentry.init({
  dsn: clientEnv.NEXT_PUBLIC_SENTRY_DSN,
  environment: clientEnv.NEXT_PUBLIC_VERCEL_ENV ?? "development",
  tracesSampleRate: 0.2,
  enabled: Boolean(clientEnv.NEXT_PUBLIC_SENTRY_DSN),
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
