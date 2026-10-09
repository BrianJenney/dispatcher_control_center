"use client";

import { ActivityList } from "@/components/activity-list";
import { useLiveQuery } from "@/components/live-query";
import { PageHeader } from "@/components/page-header";
import { liveQueries } from "@/components/queries";
import { EmptyState, LiveUpdatesPaused } from "@/components/states";
import { TripActions } from "@/components/trips/trip-actions";
import { TripCard } from "@/components/trips/trip-card";
import type { TripDetail } from "@/domain/trip-detail";

export function TripDetailView({ initialData }: { initialData: TripDetail }) {
  const { data, isError, refetch } = useLiveQuery(liveQueries.trip(initialData.trip.id), initialData);
  const { trip, history } = data;
  return (
    <>
      <PageHeader eyebrow="Trip" title={`Trip #${String(trip.reference)}`} description={trip.customerName} />
      <div className="space-y-6">
        {isError ? <LiveUpdatesPaused what="this trip" onRetry={() => void refetch()} /> : null}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <TripCard trip={trip} showDate actions={<TripActions trip={trip} />} />
          <section aria-labelledby="trip-history-heading" className="space-y-3">
            <h2 id="trip-history-heading" className="text-lg font-semibold">
              History
            </h2>
            {history.length === 0 ? (
              <EmptyState title="No history yet" description="Bookings, edits, assignments and status moves on this trip will show here." />
            ) : (
              <ActivityList label="Trip history" entries={history} />
            )}
          </section>
        </div>
      </div>
    </>
  );
}
