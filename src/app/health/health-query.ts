import { healthSnapshot } from "@/domain/health-check";

export const healthQuery = {
  queryKey: ["health"] as const,
  url: "/api/health",
  schema: healthSnapshot,
};
