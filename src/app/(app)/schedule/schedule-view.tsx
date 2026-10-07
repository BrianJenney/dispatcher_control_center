"use client";

import { useState } from "react";
import { useFormat } from "@/components/format";
import { useLiveQuery } from "@/components/live-query";
import { liveQueries } from "@/components/queries";
import { EmptyState, LiveUpdatesPaused } from "@/components/states";
import { TripActions } from "@/components/trips/trip-actions";
import { TripCard } from "@/components/trips/trip-card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { groupByHour, type ScheduleSnapshot } from "@/domain/schedule";
import { byPickupTime, filterTrips, type TripFilter } from "@/domain/trip-row";
import { isFinal, statusLabels, tripStatuses } from "@/domain/trip-status";

const everyone = "all";

function isStatus(value: string): value is (typeof tripStatuses)[number] {
  return tripStatuses.some((status) => status === value);
}

export function ScheduleView({ initialData }: { initialData: ScheduleSnapshot }) {
  const format = useFormat();
  const { data, isError, refetch } = useLiveQuery(liveQueries.schedule, initialData);
  const [filter, setFilter] = useState<TripFilter>({ status: null, driverId: null });
  const [showFinished, setShowFinished] = useState(false);
  const filtered = filter.status !== null || filter.driverId !== null;
  const hidesFinished = !showFinished && filter.status === null;
  const finishedCount = data.trips.filter((trip) => isFinal(trip.status)).length;
  const matching = filterTrips([...data.trips].sort(byPickupTime), filter);
  const visible = hidesFinished ? matching.filter((trip) => !isFinal(trip.status)) : matching;
  const groups = groupByHour(visible, format.hour);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[repeat(2,minmax(0,14rem))_auto] sm:items-end">
        <div className="grid gap-2">
          <Label htmlFor="schedule-status">Status</Label>
          <Select
            value={filter.status ?? everyone}
            onValueChange={(value) => {
              setFilter((current) => ({ ...current, status: isStatus(value) ? value : null }));
            }}
          >
            <SelectTrigger id="schedule-status" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={everyone}>All statuses</SelectItem>
              {tripStatuses.map((status) => (
                <SelectItem key={status} value={status}>
                  {statusLabels[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="schedule-driver">Driver</Label>
          <Select
            value={filter.driverId ?? everyone}
            onValueChange={(value) => {
              setFilter((current) => ({ ...current, driverId: value === everyone ? null : value }));
            }}
          >
            <SelectTrigger id="schedule-driver" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={everyone}>All drivers</SelectItem>
              {data.drivers.map((driver) => (
                <SelectItem key={driver.id} value={driver.id}>
                  {driver.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {filtered ? (
          <Button
            variant="ghost"
            onClick={() => {
              setFilter({ status: null, driverId: null });
            }}
          >
            Clear filters
          </Button>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {visible.length} of {data.trips.length} trips on {format.day(data.today.start)}
        </p>
        {finishedCount > 0 && filter.status === null ? (
          <Button
            variant="outline"
            className="h-11 sm:h-8"
            aria-pressed={showFinished}
            onClick={() => {
              setShowFinished((current) => !current);
            }}
          >
            {showFinished ? "Hide finished trips" : `Show ${String(finishedCount)} finished trips`}
          </Button>
        ) : null}
      </div>
      {isError ? (
        <LiveUpdatesPaused what="the schedule" onRetry={() => void refetch()} />
      ) : null}
      {groups.length === 0 ? (
        filtered ? (
          <EmptyState title="No trips match these filters" description="Try another status or driver." />
        ) : (
          <EmptyState title="No trips today" description="New bookings for today will appear here." />
        )
      ) : (
        <ol aria-label="Timeline" className="relative space-y-6 border-l border-border pl-5 sm:pl-8">
          {groups.map((group) => (
            <li key={group.hour} className="relative">
              <span aria-hidden className="absolute top-1.5 -left-[1.6rem] size-2.5 rounded-full bg-gold ring-4 ring-background sm:-left-[2.35rem]" />
              <h2 className="mb-3 text-sm font-semibold text-muted-foreground tabular-nums">{group.hour}</h2>
              <ul className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                {group.trips.map((trip) => (
                  <li key={trip.id}>
                    <TripCard trip={trip} actions={<TripActions trip={trip} />} />
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
