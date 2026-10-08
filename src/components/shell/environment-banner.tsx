import { env } from "@/env";

export function EnvironmentBanner() {
  if (env.VERCEL_ENV !== "preview") return null;
  return (
    <p role="status" className="bg-accent px-4 py-2 text-center text-xs font-medium text-accent-foreground">
      Preview environment. This copy has its own database, so nothing changed here touches production.
    </p>
  );
}
