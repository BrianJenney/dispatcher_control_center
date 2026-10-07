"use client";

import { ArrowRight, Users } from "lucide-react";
import type { ReactNode } from "react";
import { useFormat } from "@/components/format";
import { StatusBadge } from "@/components/trips/status-badge";
import { vehicleClassLabels } from "@/domain/fleet";
import type { TripRow } from "@/domain/trip-row";

export function TripCard({ trip, actions }: { trip: TripRow; actions?: ReactNode }) {
  const format = useFormat();
  return (
    <article
      aria-label={`Trip ${String(trip.reference)} for ${trip.customerName}`}
      data-pickup-at={trip.pickupAt}
      className="rounded-xl border bg-card p-4 shadow-xs transition-shadow hover:shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
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
      {actions ? <div className="mt-4 flex flex-wrap gap-2">{actions}</div> : null}
    </article>
  );
}
