"use client";

import { useId, useLayoutEffect, useRef } from "react";
import { useFormat } from "@/components/format";
import { shortName } from "@/components/initials";
import { statusFill } from "@/components/trips/status-badge";
import { showTripCard } from "@/components/trips/trip-focus";
import { cn } from "@/components/ui/utils";
import { axisPosition, placeOnAxis, timelineRows, type TimelineAxis } from "@/domain/schedule";
import type { TripRow } from "@/domain/trip-row";
import { statusLabels, tripStatuses, type TripStatus } from "@/domain/trip-status";

const hourWidthRem = 3.5;
const laneHeightRem = 2.25;
const rowPaddingRem = 0.25;

const barTone: Record<TripStatus, string> = {
  offer: "border-status-offer bg-status-offer/12",
  assigned: "border-status-assigned bg-status-assigned/12",
  en_route: "border-status-en-route bg-status-en-route/22",
  completed: "border-status-completed bg-status-completed/10 text-muted-foreground",
  cancelled: "border-status-cancelled/50 bg-muted text-muted-foreground line-through",
};

function percent(fraction: number): string {
  return `${String(fraction * 100)}%`;
}

function rem(value: number): string {
  return `${String(value)}rem`;
}

export function DayOverview({ axis, trips, now }: { axis: TimelineAxis; trips: readonly TripRow[]; now: string }) {
  const format = useFormat();
  const headingId = useId();
  const scroller = useRef<HTMLDivElement>(null);
  const nowLine = useRef<HTMLDivElement>(null);
  const rows = timelineRows(trips);
  const nowAt = axisPosition(axis, now);
  const trackWidth = { minWidth: rem(axis.hours.length * hourWidthRem) };

  useLayoutEffect(() => {
    const box = scroller.current;
    const line = nowLine.current;
    if (!box || !line) return;
    const lineX = line.getBoundingClientRect().left - box.getBoundingClientRect().left + box.scrollLeft;
    box.scrollLeft = lineX - box.clientWidth / 2;
  }, []);

  return (
    <section aria-labelledby={headingId} className="rounded-xl border bg-card shadow-xs">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 pt-4 sm:px-5">
        <h2 id={headingId} className="text-lg font-semibold">
          Day at a glance
        </h2>
        <p className="text-xs text-muted-foreground tabular-nums">
          {format.time(axis.start)} to {format.time(axis.end)}, one row per driver
        </p>
      </div>
      <p className="sr-only">Each trip is drawn along today&apos;s hours. The timeline below lists the same trips with their actions.</p>
      <div aria-hidden>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 px-4 pt-2 text-xs text-muted-foreground sm:px-5">
          {tripStatuses.map((status) => (
            <li key={status} className="flex items-center gap-1.5">
              <span className={cn("size-2 rounded-full", statusFill[status])} />
              {statusLabels[status]}
            </li>
          ))}
        </ul>
        <div ref={scroller} className="mt-3 overflow-x-auto overscroll-x-contain rounded-b-xl">
          <div className="relative w-max min-w-full pb-2">
            <div className="pointer-events-none absolute inset-y-0 right-0 left-28 sm:left-44">
              {nowAt === null ? null : (
                <div className="absolute inset-y-0 left-0 bg-muted/60" style={{ width: percent(nowAt) }} />
              )}
              {axis.hours.map((hour) => (
                <div key={hour} className="absolute inset-y-0 border-l border-border/70" style={{ left: percent(axisPosition(axis, hour) ?? 0) }} />
              ))}
            </div>
            <div className="flex">
              <div className="sticky left-0 z-20 w-28 shrink-0 bg-card sm:w-44" />
              <div className="relative h-11 flex-1" style={trackWidth}>
                {axis.hours.map((hour) => (
                  <span
                    key={hour}
                    className="absolute bottom-2 pl-1.5 text-[11px] leading-none text-muted-foreground tabular-nums"
                    style={{ left: percent(axisPosition(axis, hour) ?? 0) }}
                  >
                    {format.hour(hour)}
                  </span>
                ))}
              </div>
            </div>
            {rows.map((row) => (
              <div key={row.driver?.id ?? "needs-driver"} className="flex border-t border-border/70">
                <div className="sticky left-0 z-20 flex w-28 shrink-0 items-center bg-card px-4 sm:w-44 sm:px-5">
                  {row.driver ? (
                    <span className="truncate text-xs font-medium sm:text-sm">
                      <span className="sm:hidden">{shortName(row.driver.name)}</span>
                      <span className="hidden sm:inline">{row.driver.name}</span>
                    </span>
                  ) : (
                    <span className="text-xs leading-tight font-medium text-status-offer sm:text-sm">Needs a driver</span>
                  )}
                </div>
                <div className="relative flex-1" style={{ ...trackWidth, height: rem(row.lanes * laneHeightRem + rowPaddingRem * 2) }}>
                  {row.trips.map(({ trip, lane }) => {
                    const place = placeOnAxis(axis, trip);
                    return (
                      <button
                        key={trip.id}
                        type="button"
                        tabIndex={-1}
                        title={`${format.timeRange(trip.pickupAt, trip.durationMinutes)} · ${trip.customerName} · ${statusLabels[trip.status]}`}
                        className={cn(
                          "absolute flex h-7 min-w-2 items-center overflow-hidden rounded-md border-l-[3px] px-1.5 text-left text-[11px] leading-none font-medium shadow-xs transition-shadow hover:shadow-md",
                          place.runsOver && "rounded-r-none",
                          barTone[trip.status],
                        )}
                        style={{
                          left: percent(place.left),
                          width: percent(place.width),
                          top: rem(lane * laneHeightRem + rowPaddingRem + 0.125),
                        }}
                        onClick={() => {
                          showTripCard(trip.id);
                        }}
                      >
                        <span className="truncate">{trip.customerName}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            {nowAt === null ? null : (
              <div className="pointer-events-none absolute inset-y-0 right-0 left-28 z-10 sm:left-44">
                <div ref={nowLine} className="absolute top-0 bottom-0 w-0.5 -translate-x-1/2 bg-gold" style={{ left: percent(nowAt) }}>
                  <span className="absolute top-1 left-1/2 -translate-x-1/2 rounded-full bg-gold px-2 py-0.5 text-[11px] leading-none font-semibold whitespace-nowrap text-gold-foreground tabular-nums shadow-xs">
                    {format.time(now)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
