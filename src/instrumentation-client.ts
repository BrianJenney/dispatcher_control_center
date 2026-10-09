import { clientEnv } from "@/env-client";

type RouterTransitionStart = (href: string, navigationType: string) => void;

const earlyErrors: unknown[] = [];
let routerTransitionStart: RouterTransitionStart | null = null;

function keepEarlyError(event: ErrorEvent | PromiseRejectionEvent) {
  earlyErrors.push(event instanceof ErrorEvent ? event.error : event.reason);
}

function whenIdle(task: () => void) {
  if ("requestIdleCallback" in window) requestIdleCallback(task, { timeout: 3000 });
  else setTimeout(task, 1);
}

function afterPageLoad(task: () => void) {
  const runWhenIdle = () => {
    whenIdle(task);
  };
  if (document.readyState === "complete") runWhenIdle();
  else window.addEventListener("load", runWhenIdle, { once: true });
}

function startMonitoringAfterLoad(dsn: string) {
  window.addEventListener("error", keepEarlyError);
  window.addEventListener("unhandledrejection", keepEarlyError);
  afterPageLoad(() => {
    void import("@/browser-monitoring").then(({ startBrowserMonitoring }) => {
      whenIdle(() => {
        window.removeEventListener("error", keepEarlyError);
        window.removeEventListener("unhandledrejection", keepEarlyError);
        routerTransitionStart = startBrowserMonitoring(dsn, earlyErrors.splice(0));
      });
    });
  });
}

if (clientEnv.NEXT_PUBLIC_SENTRY_DSN) startMonitoringAfterLoad(clientEnv.NEXT_PUBLIC_SENTRY_DSN);

export function onRouterTransitionStart(href: string, navigationType: string) {
  routerTransitionStart?.(href, navigationType);
}
