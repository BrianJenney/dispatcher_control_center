"use client";

import { Car, CircleDollarSign, Route as RouteIcon, UserCheck } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useId } from "react";
import { useFormat } from "@/components/format";
import { KpiTile } from "@/components/kpi-tile";
import { useLiveQuery } from "@/components/live-query";
import { liveQueries } from "@/components/queries";
import { EmptyState, LiveUpdatesPaused } from "@/components/states";
import { tourTarget } from "@/components/tour-target";
import { TripActions } from "@/components/trips/trip-actions";
import { TripCard } from "@/components/trips/trip-card";
import { dashboardLists, isPickedUpToday, summarizeDashboard, type DashboardSnapshot } from "@/domain/dashboard";
import { jobsSearch } from "@/domain/jobs";
import { pageSize } from "@/domain/paging";
import type { TourTarget } from "@/domain/tour";
import type { TripRow } from "@/domain/trip-row";

const listLimit = 5;

const inSchedule = { href: "/schedule", place: "in the schedule" } as const;

const enRouteJobs = {
  href: `/jobs?${jobsSearch({ q: "", status: "en_route", show: pageSize })}`,
  place: "in jobs",
} as const;

export function DashboardView({ initialData }: { initialData: DashboardSnapshot }) {
  const format = useFormat();
  const { data, isError, refetch } = useLiveQuery(liveQueries.dashboard, initialData);
  const kpis = summarizeDashboard(data);
  const { needsDriver, onTheRoad, upNext } = dashboardLists(data);

  return (
    <div className="space-y-8">
      <p className="-mt-4 text-sm text-muted-foreground lg:-mt-6">{format.day(data.today.start)}</p>
      {isError ? (
        <LiveUpdatesPaused what="the numbers" onRetry={() => void refetch()} />
      ) : null}
      <section aria-label="Key numbers" {...tourTarget("kpis")} className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <KpiTile
          label="Active jobs"
          value={String(kpis.activeJobs)}
          detail={`${String(kpis.enRouteNow)} en route now`}
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
          tour="needs-driver"
          trips={needsDriver}
          today={data.today}
          seeAll={inSchedule}
          empty={{ title: "Every trip today has a driver", description: "New offers will appear here." }}
        />
        <div className="space-y-8">
          <TripList
            title="On the road"
            trips={onTheRoad}
            today={data.today}
            seeAll={enRouteJobs}
            empty={{ title: "Nothing on the road", description: "Trips appear here once the driver sets off." }}
          />
          <TripList
            title="Up next"
            trips={upNext}
            today={data.today}
            seeAll={inSchedule}
            empty={{ title: "No assigned trips waiting", description: "Assigned trips appear here until they start." }}
          />
        </div>
      </div>
    </div>
  );
}

function TripList({
  title,
  tour,
  trips,
  today,
  seeAll,
  empty,
}: {
  title: string;
  tour?: TourTarget;
  trips: TripRow[];
  today: DashboardSnapshot["today"];
  seeAll: { href: Route; place: string };
  empty: { title: string; description: string };
}) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} {...tourTarget(tour)} className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 id={headingId} className="text-lg font-semibold">
          {title}
        </h2>
        <span data-testid="list-count" className="text-sm text-muted-foreground tabular-nums">
          {trips.length}
        </span>
      </div>
      {trips.length === 0 ? (
        <EmptyState title={empty.title} description={empty.description} />
      ) : (
        <ul className="space-y-3">
          {trips.slice(0, listLimit).map((trip) => (
            <li key={trip.id}>
              <TripCard trip={trip} showDate={!isPickedUpToday(trip, today)} actions={<TripActions trip={trip} />} />
            </li>
          ))}
        </ul>
      )}
      {trips.length > listLimit ? (
        <Link href={seeAll.href} className="inline-block text-sm font-medium text-primary underline-offset-4 hover:underline">
          See all {trips.length} {seeAll.place}
        </Link>
      ) : null}
    </section>
  );
}
