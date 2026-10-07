"use client";

import { CarFront } from "lucide-react";
import Link from "next/link";
import { useLiveQuery } from "@/components/live-query";
import { fleetQueryKey, VehicleStatusSwitch } from "@/components/people/vehicle-status-switch";
import { EmptyState, ErrorState } from "@/components/states";
import { cn } from "@/components/ui/utils";
import { vehicleClassLabels } from "@/domain/fleet";
import { fleetSnapshot, type VehicleRow } from "@/domain/people";

export function FleetView({ initialData }: { initialData: { vehicles: VehicleRow[] } }) {
  const { data, isError, refetch } = useLiveQuery({ queryKey: fleetQueryKey, url: "/api/fleet", schema: fleetSnapshot, initialData });
  const ready = data.vehicles.filter((vehicle) => vehicle.status === "ready").length;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {ready} of {data.vehicles.length} vehicles ready
      </p>
      {isError ? <ErrorState title="Live updates paused" description="We could not refresh the fleet." onRetry={() => void refetch()} /> : null}
      {data.vehicles.length === 0 ? (
        <EmptyState title="No vehicles yet" description="Add the first vehicle to track whether it is ready." />
      ) : (
        <ul aria-label="Vehicles" className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {data.vehicles.map((vehicle) => (
            <li key={vehicle.id}>
              <article aria-label={vehicle.unitNumber} className="flex h-full flex-col gap-4 rounded-2xl border bg-card p-4 shadow-xs">
                <div className="flex items-start gap-3">
                  <span
                    aria-hidden
                    className={cn(
                      "grid size-12 shrink-0 place-items-center rounded-xl",
                      vehicle.status === "ready" ? "bg-status-completed/12 text-status-completed" : "bg-muted text-muted-foreground",
                    )}
                  >
                    <CarFront className="size-6" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <Link href={`/fleet/${vehicle.id}`} className="block truncate font-semibold hover:underline">
                      {vehicle.model}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {vehicleClassLabels[vehicle.vehicleClass]} · {vehicle.unitNumber}
                    </p>
                  </div>
                </div>
                <dl className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <dt className="text-muted-foreground">Plate</dt>
                    <dd className="font-medium tracking-wide">{vehicle.plate}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Registration</dt>
                    <dd className="font-medium">{vehicle.registrations > 0 ? "On file" : "Missing"}</dd>
                  </div>
                </dl>
                <div className="mt-auto flex items-center justify-between border-t pt-3">
                  <VehicleStatusSwitch vehicle={vehicle} />
                  <Link href={`/fleet/${vehicle.id}`} className="text-sm font-medium text-primary hover:underline">
                    Details
                  </Link>
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
