import { z } from "zod";
import { pageSize, shownCount } from "@/domain/paging";
import { vehicleClasses } from "@/domain/fleet";
import { tripRow } from "@/domain/trip-row";
import { tripStatuses } from "@/domain/trip-status";

export const jobsSearchId = "jobs-search";

export const jobsSearchLabel = "Search by customer or trip number";

const largestTripReference = 2_147_483_647;

export function tripReferenceIn(q: string): number | null {
  const reference = Number(/^#?\s*(\d+)$/.exec(q.trim())?.[1]);
  return reference >= 1 && reference <= largestTripReference ? reference : null;
}

export const jobsFilter = z.object({
  q: z.string().trim().max(80).catch(""),
  status: z.enum(tripStatuses).nullable().catch(null),
  show: shownCount,
});

export type JobsFilter = z.output<typeof jobsFilter>;

export function jobsSearch(filter: JobsFilter): string {
  const params = new URLSearchParams();
  if (filter.q) params.set("q", filter.q);
  if (filter.status) params.set("status", filter.status);
  if (filter.show !== pageSize) params.set("show", String(filter.show));
  return params.toString();
}

export const jobsSnapshot = z.object({ trips: z.array(tripRow), hasMore: z.boolean() });

export type JobsSnapshot = z.infer<typeof jobsSnapshot>;

export const driverSuggestions = z.object({
  vehicleClass: z.enum(vehicleClasses),
  onDutyInClass: z.number().int(),
  suggestions: z.array(z.object({ id: z.uuid(), name: z.string(), tripsToday: z.number().int() })),
});

export type DriverSuggestions = z.infer<typeof driverSuggestions>;
