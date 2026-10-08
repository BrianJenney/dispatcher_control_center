"use client";

import { ArrowRight, Users } from "lucide-react";
import type { ReactNode } from "react";
import { useFormat } from "@/components/format";
import { StatusBadge } from "@/components/trips/status-badge";
import { tripCardId } from "@/components/trips/trip-focus";
import { cn } from "@/components/ui/utils";
import { vehicleClassLabels } from "@/domain/fleet";
import type { TripRow } from "@/domain/trip-row";

const cardFocus = "scroll-mt-20 outline-none focus-visible:ring-3 focus-visible:ring-ring";

function cardAttributes(trip: TripRow) {
  return {
    id: tripCardId(trip.id),
    tabIndex: -1,
    "data-trip-card": "",
    "data-pickup-at": trip.pickupAt,
    "aria-label": `Trip ${String(trip.reference)} for ${trip.customerName}`,
  };
}

export function TripCard({
  trip,
  actions,
  showDate = false,
  compact = false,
}: {
  trip: TripRow;
  actions?: ReactNode;
  showDate?: boolean;
  compact?: boolean;
}) {
  const format = useFormat();
  if (compact) {
    return (
      <article {...cardAttributes(trip)} className={cn("rounded-xl border bg-card px-4 py-3 shadow-xs", cardFocus)}>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm">
              <span className="font-semibold tabular-nums">{format.time(trip.pickupAt)}</span>{" "}
              <span className="font-medium">{trip.customerName}</span>
            </p>
            <p className="truncate text-xs text-muted-foreground">
              <span data-testid="trip-driver">{trip.driver ? trip.driver.name : "No driver yet"}</span> · #{trip.reference}
              {trip.status === "cancelled" && trip.cancelReason ? <span> · Cancelled: {trip.cancelReason}</span> : null}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <StatusBadge status={trip.status} />
            <span className="text-xs font-semibold tabular-nums">{format.money(trip.fareCents)}</span>
          </div>
        </div>
      </article>
    );
  }
  return (
    <article
      {...cardAttributes(trip)}
      className={cn("rounded-xl border bg-card p-4 shadow-xs transition-shadow hover:shadow-sm", cardFocus)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {showDate ? <p className="text-xs font-medium text-muted-foreground">{format.shortDay(trip.pickupAt)}</p> : null}
          <p className="text-lg font-semibold tabular-nums">{format.time(trip.pickupAt)}</p>
          <p className="truncate text-sm font-medium">{trip.customerName}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <StatusBadge status={trip.status} />
          <span className="text-xs text-muted-foreground tabular-nums">#{trip.reference}</span>
        </div>
      </div>
      <p className="mt-3 flex flex-wrap items-center gap-x-1.5 text-sm text-muted-foreground">
        <span className="text-foreground">{trip.pickupAddress}</span>
        <ArrowRight className="size-3.5 shrink-0" aria-label="to" />
        <span className="text-foreground">{trip.dropoffAddress}</span>
      </p>
      <dl className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <div>
          <dt className="sr-only">Vehicle class</dt>
          <dd>{vehicleClassLabels[trip.vehicleClass]}</dd>
        </div>
        <div className="flex items-center gap-1">
          <dt>
            <Users className="size-3.5" aria-label="Passengers" />
          </dt>
          <dd className="tabular-nums">{trip.passengers}</dd>
        </div>
        <div>
          <dt className="sr-only">Driver</dt>
          <dd data-testid="trip-driver">{trip.driver ? trip.driver.name : "No driver yet"}</dd>
        </div>
        <div className="ml-auto">
          <dt className="sr-only">Fare</dt>
          <dd className="text-sm font-semibold text-foreground tabular-nums">{format.money(trip.fareCents)}</dd>
        </div>
      </dl>
      {trip.status === "cancelled" && trip.cancelReason ? (
        <p className="mt-2 text-xs text-muted-foreground">Cancelled: {trip.cancelReason}</p>
      ) : null}
      {actions ? <div className="mt-4">{actions}</div> : null}
    </article>
  );
}
