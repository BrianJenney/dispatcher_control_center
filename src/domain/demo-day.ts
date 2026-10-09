import type { TripStatus } from "@/domain/trip-status";

export const unassignedAtPickup = "No driver was assigned before pickup.";

const closeOutPaths: Partial<Record<TripStatus, readonly TripStatus[]>> = {
  offer: ["cancelled"],
  assigned: ["en_route", "completed"],
  en_route: ["completed"],
};

export function closeOutPath(status: TripStatus): readonly TripStatus[] {
  return closeOutPaths[status] ?? [];
}

export function daySeed(day: Date): number {
  return Math.floor(day.getTime() / 86_400_000);
}
