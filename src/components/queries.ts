import type { z } from "zod";
import { activitySnapshot } from "@/domain/activity";
import { dashboardSnapshot } from "@/domain/dashboard";
import { healthSnapshot } from "@/domain/health-check";
import { insightsSnapshot } from "@/domain/insights";
import { driverSuggestions, jobsSnapshot } from "@/domain/jobs";
import { driversSnapshot, fleetSnapshot } from "@/domain/people";
import { scheduleSnapshot } from "@/domain/schedule";

export type LiveQueryDefinition<T> = { queryKey: readonly unknown[]; url: string; schema: z.ZodType<T> };

export const tripsQueryKey = ["trips"] as const;
export const driversQueryKey = ["drivers"] as const;
export const fleetQueryKey = ["fleet"] as const;

export const liveQueries = {
  health: { queryKey: ["health"], url: "/api/health", schema: healthSnapshot },
  dashboard: { queryKey: [...tripsQueryKey, "dashboard"], url: "/api/dashboard", schema: dashboardSnapshot },
  insights: { queryKey: [...tripsQueryKey, "insights"], url: "/api/insights", schema: insightsSnapshot },
  schedule: { queryKey: [...tripsQueryKey, "schedule"], url: "/api/schedule", schema: scheduleSnapshot },
  activity: (show: number) => ({ queryKey: [...tripsQueryKey, "activity", show], url: `/api/activity?show=${String(show)}`, schema: activitySnapshot }),
  jobs: (search: string) => ({ queryKey: [...tripsQueryKey, "jobs", search], url: `/api/jobs?${search}`, schema: jobsSnapshot }),
  drivers: { queryKey: driversQueryKey, url: "/api/drivers", schema: driversSnapshot },
  fleet: { queryKey: fleetQueryKey, url: "/api/fleet", schema: fleetSnapshot },
  suggestions: (tripId: string) => ({
    queryKey: ["suggestions", tripId],
    url: `/api/trips/${tripId}/suggestions`,
    schema: driverSuggestions,
  }),
} satisfies Record<
  string,
  LiveQueryDefinition<unknown> | ((value: string) => LiveQueryDefinition<unknown>) | ((value: number) => LiveQueryDefinition<unknown>)
>;
