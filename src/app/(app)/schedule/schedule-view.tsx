"use client";

import { Clock, Plus } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useId, useOptimistic, useRef, useTransition } from "react";
import { DayOverview } from "@/app/(app)/schedule/day-overview";
import { useFormat } from "@/components/format";
import { useLiveQuery } from "@/components/live-query";
import { liveQueries } from "@/components/queries";
import { EmptyState, LiveUpdatesPaused } from "@/components/states";
import { statusFill } from "@/components/trips/status-badge";
import { StatusFilter } from "@/components/trips/status-filter";
import { TripActions } from "@/components/trips/trip-actions";
import { TripCard } from "@/components/trips/trip-card";
import { scrollGently } from "@/components/trips/trip-focus";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/components/ui/utils";
import {
  filterTrips,
  isFiltered,
  noScheduleFilter,
  scheduleSearch,
  timelineAxis,
  upcomingIndex,
  type ScheduleFilter,
  type ScheduleSnapshot,
} from "@/domain/schedule";
import { byPickupTime } from "@/domain/trip-row";
import { isFinal } from "@/domain/trip-status";

const everyone = "all";

function scheduleHref(filter: ScheduleFilter): Route {
  const search = scheduleSearch(filter);
  return search ? `/schedule?${search}` : "/schedule";
}

export function ScheduleView({ filter, initialData }: { filter: ScheduleFilter; initialData: ScheduleSnapshot }) {
  const format = useFormat();
  const router = useRouter();
  const [, startNavigation] = useTransition();
  const [shown, showNow] = useOptimistic(filter);
  const { data, isError, refetch } = useLiveQuery(liveQueries.schedule, initialData);
  const driverFilter = useRef<HTMLButtonElement>(null);
  const nowMarker = useRef<HTMLLIElement>(null);
  const timelineId = useId();
  const sorted = [...data.trips].sort(byPickupTime);
  const visible = filterTrips(sorted, shown);
  const upcoming = upcomingIndex(visible, data.now);
  const filtered = isFiltered(shown);
  const driverValue = data.drivers.some((driver) => driver.id === shown.driver) ? shown.driver : null;

  function show(next: ScheduleFilter) {
    startNavigation(() => {
      showNow(next);
      router.replace(scheduleHref(next), { scroll: false });
    });
  }

  function clearFilters() {
    driverFilter.current?.focus();
    show(noScheduleFilter);
  }

  function jumpToNow() {
    if (nowMarker.current) scrollGently(nowMarker.current);
  }

  const nowMarkerItem = (
    <li ref={nowMarker} className="relative flex items-center gap-3 py-1">
      <span aria-hidden className="absolute top-1/2 -left-[18px] size-3 -translate-y-1/2 rounded-full bg-gold ring-4 ring-gold/25 sm:-left-[22px]" />
      <span className="rounded-full bg-gold px-2.5 py-1 text-xs font-semibold text-gold-foreground tabular-nums">
        Now, {format.time(data.now)}
      </span>
      <span aria-hidden className="h-0.5 flex-1 rounded-full bg-gold/70" />
    </li>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <StatusFilter
            value={shown.status}
            onChange={(status) => {
              show({ ...shown, status });
            }}
          />
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="grid w-full gap-2 sm:w-64">
            <Label htmlFor="schedule-driver">Driver</Label>
            <Select
              value={driverValue ?? everyone}
              onValueChange={(value) => {
                show({ ...shown, driver: value === everyone ? null : value });
              }}
            >
              <SelectTrigger ref={driverFilter} id="schedule-driver" className="w-full">
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
            <Button variant="ghost" onClick={clearFilters}>
              Clear filters
            </Button>
          ) : null}
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {visible.length} of {data.trips.length} trips on {format.day(data.today.start)}
        </p>
        {upcoming > 0 && visible.length > 0 ? (
          <Button variant="outline" size="sm" onClick={jumpToNow}>
            <Clock aria-hidden />
            Jump to now
          </Button>
        ) : null}
      </div>
      {isError ? <LiveUpdatesPaused what="the schedule" onRetry={() => void refetch()} /> : null}
      {visible.length === 0 ? (
        filtered ? (
          <EmptyState
            title="No trips match these filters"
            description="Try another status or driver."
            action={
              <Button variant="outline" onClick={clearFilters}>
                Show all trips
              </Button>
            }
          />
        ) : (
          <EmptyState
            title="No trips today"
            description="New bookings for today will appear here as they come in."
            action={
              <Button asChild>
                <Link href="/jobs/new">
                  <Plus aria-hidden />
                  New trip
                </Link>
              </Button>
            }
          />
        )
      ) : (
        <>
          <DayOverview axis={timelineAxis(data.today, data.trips, data.now)} trips={visible} now={data.now} />
          <section aria-labelledby={timelineId} className="space-y-4">
            <h2 id={timelineId} className="text-lg font-semibold">
              Timeline
            </h2>
            <ol
              aria-labelledby={timelineId}
              className="relative space-y-3 pl-6 before:absolute before:top-3 before:bottom-3 before:left-[11px] before:w-0.5 before:rounded-full before:bg-border sm:pl-8 sm:before:left-[15px]"
            >
              {visible.map((trip, index) => (
                <Fragment key={trip.id}>
                  {index === upcoming ? nowMarkerItem : null}
                  <li className="relative">
                    <span
                      aria-hidden
                      className={cn(
                        "absolute top-5 -left-[18px] size-3 rounded-full ring-4 ring-background sm:-left-[22px]",
                        statusFill[trip.status],
                      )}
                    />
                    <TripCard trip={trip} compact={isFinal(trip.status)} actions={<TripActions trip={trip} />} />
                  </li>
                </Fragment>
              ))}
              {upcoming === visible.length ? nowMarkerItem : null}
            </ol>
          </section>
        </>
      )}
    </div>
  );
}
