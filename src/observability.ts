import * as Sentry from "@sentry/nextjs";

export const tracesSampleRate = 1;

export function reportError(error: unknown) {
  console.error(error);
  Sentry.captureException(error);
}
