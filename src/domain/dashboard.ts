import { z } from "zod";
import { vehicleStatuses } from "@/domain/fleet";
import { dashboardKpis, type DashboardKpis } from "@/domain/kpis";
import { tripRow } from "@/domain/trip-row";

export const dashboardSnapshot = z.object({
  today: z.object({ start: z.iso.datetime({ offset: true }), end: z.iso.datetime({ offset: true }) }),
  trips: z.array(tripRow),
  drivers: z.array(z.object({ onDuty: z.boolean() })),
  vehicles: z.array(z.object({ status: z.enum(vehicleStatuses) })),
});

export type DashboardSnapshot = z.infer<typeof dashboardSnapshot>;

export function summarizeDashboard(snapshot: DashboardSnapshot): DashboardKpis {
  return dashboardKpis({
    trips: snapshot.trips.map((trip) => ({
      status: trip.status,
      fareCents: trip.fareCents,
      pickupAt: new Date(trip.pickupAt),
      driverId: trip.driver?.id ?? null,
    })),
    drivers: snapshot.drivers,
    vehicles: snapshot.vehicles,
    today: { start: new Date(snapshot.today.start), end: new Date(snapshot.today.end) },
  });
}
