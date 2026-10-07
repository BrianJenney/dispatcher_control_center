"use client";

import { Car, CircleDollarSign, Route as RouteIcon, UserCheck } from "lucide-react";
import Link from "next/link";
import { useId } from "react";
import { useFormat } from "@/components/format";
import { KpiTile } from "@/components/kpi-tile";
import { useLiveQuery } from "@/components/live-query";
import { EmptyState, ErrorState } from "@/components/states";
import { TripActions } from "@/components/trips/trip-actions";
import { TripCard } from "@/components/trips/trip-card";
import { tripsQueryKey } from "@/components/trips/use-trip-move";
import { dashboardSnapshot, summarizeDashboard, type DashboardSnapshot } from "@/domain/dashboard";
import { byPickupTime, type TripRow } from "@/domain/trip-row";

export const dashboardQuery = {
  queryKey: [...tripsQueryKey, "dashboard"] as const,
  url: "/api/dashboard",
  schema: dashboardSnapshot,
};

const listLimit = 5;

function isToday(trip: TripRow, today: DashboardSnapshot["today"]) {
  return trip.pickupAt >= today.start && trip.pickupAt < today.end;
}

export function DashboardView({ initialData }: { initialData: DashboardSnapshot }) {
  const format = useFormat();
  const { data, isError, refetch } = useLiveQuery({ ...dashboardQuery, initialData });
  const kpis = summarizeDashboard(data);
  const sorted = [...data.trips].sort(byPickupTime);
  const needsDriver = sorted.filter((trip) => trip.status === "offer" && isToday(trip, data.today));
  const onTheRoad = sorted.filter((trip) => trip.status === "en_route");
  const upNext = sorted.filter((trip) => trip.status === "assigned");

  return (
    <div className="space-y-8">
      <p className="-mt-4 text-sm text-muted-foreground lg:-mt-6">{format.day(data.today.start)}</p>
      {isError ? (
        <ErrorState
          title="Live updates paused"
          description="We could not refresh the numbers. They will update again once the connection is back."
          onRetry={() => void refetch()}
        />
      ) : null}
      <section aria-label="Key numbers" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <KpiTile
          label="Active jobs"
          value={String(kpis.activeJobs)}
          detail={`${String(onTheRoad.length)} en route now`}
          icon={RouteIcon}
        />
        <KpiTile
          label="Drivers on duty"
          value={String(kpis.driversOnDuty)}
          detail={`of ${String(kpis.driversTotal)} drivers`}
          icon={UserCheck}
        />
        <KpiTile
          label="Fleet ready"
          value={`${String(kpis.fleetReady)}/${String(kpis.fleetTotal)}`}
          detail={`${String(kpis.fleetTotal - kpis.fleetReady)} in service`}
          icon={Car}
        />
        <KpiTile
          label="Today's revenue"
          value={format.money(kpis.revenueTodayCents)}
          detail={`${String(kpis.completedToday)} completed ${kpis.completedToday === 1 ? "trip" : "trips"}`}
          icon={CircleDollarSign}
        />
      </section>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <TripList
          title="Needs a driver"
          trips={needsDriver}
          empty={{ title: "Every trip today has a driver", description: "New offers will appear here." }}
        />
        <div className="space-y-8">
          <TripList
            title="On the road"
            trips={onTheRoad}
            empty={{ title: "Nothing on the road", description: "Trips appear here once the driver sets off." }}
          />
          <TripList
            title="Up next"
            trips={upNext}
            empty={{ title: "No assigned trips waiting", description: "Assigned trips appear here until they start." }}
          />
        </div>
      </div>
    </div>
  );
}

function TripList({
  title,
  trips,
  empty,
}: {
  title: string;
  trips: TripRow[];
  empty: { title: string; description: string };
}) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 id={headingId} className="text-lg font-semibold">
          {title}
        </h2>
        <span className="text-sm text-muted-foreground tabular-nums">{trips.length}</span>
      </div>
      {trips.length === 0 ? (
        <EmptyState title={empty.title} description={empty.description} />
      ) : (
        <ul className="space-y-3">
          {trips.slice(0, listLimit).map((trip) => (
            <li key={trip.id}>
              <TripCard trip={trip} actions={<TripActions trip={trip} />} />
            </li>
          ))}
        </ul>
      )}
      {trips.length > listLimit ? (
        <Link href="/schedule" className="inline-block text-sm font-medium text-primary underline-offset-4 hover:underline">
          See all {trips.length} in the schedule
        </Link>
      ) : null}
    </section>
  );
}
