"use client";

import { Phone } from "lucide-react";
import Link from "next/link";
import { useLiveQuery } from "@/components/live-query";
import { DriverAvatar } from "@/components/people/driver-avatar";
import { DutySwitch } from "@/components/people/duty-switch";
import { liveQueries } from "@/components/queries";
import { EmptyState, LiveUpdatesPaused } from "@/components/states";
import { vehicleClassLabels } from "@/domain/fleet";
import type { DriverRow } from "@/domain/people";

export function DriversView({ initialData }: { initialData: { drivers: DriverRow[] } }) {
  const { data, isError, refetch } = useLiveQuery(liveQueries.drivers, initialData);
  const onDuty = data.drivers.filter((driver) => driver.onDuty).length;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {onDuty} of {data.drivers.length} drivers on duty
      </p>
      {isError ? <LiveUpdatesPaused what="the drivers" onRetry={() => void refetch()} /> : null}
      {data.drivers.length === 0 ? (
        <EmptyState title="No drivers yet" description="Add your first chauffeur to start assigning trips." />
      ) : (
        <ul aria-label="Drivers" className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {data.drivers.map((driver) => (
            <li key={driver.id}>
              <article aria-label={driver.name} className="flex h-full flex-col gap-4 rounded-2xl border bg-card p-4 shadow-xs">
                <div className="flex items-center gap-3">
                  <DriverAvatar driver={driver} />
                  <div className="min-w-0 flex-1">
                    <Link href={`/drivers/${driver.id}`} className="block truncate font-semibold hover:underline">
                      {driver.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">{vehicleClassLabels[driver.vehicleClass]}</p>
                  </div>
                </div>
                <dl className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <dt className="text-muted-foreground">Today</dt>
                    <dd className="font-medium tabular-nums">
                      {driver.tripsToday} {driver.tripsToday === 1 ? "trip" : "trips"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">License</dt>
                    <dd className="font-medium">{driver.licenses > 0 ? "On file" : "Missing"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Phone</dt>
                    <dd>
                      <a href={`tel:${driver.phone}`} className="inline-flex items-center gap-1 font-medium hover:underline">
                        <Phone className="size-3" aria-hidden />
                        Call
                      </a>
                    </dd>
                  </div>
                </dl>
                <div className="mt-auto flex items-center justify-between border-t pt-3">
                  <DutySwitch driver={driver} />
                  <Link href={`/drivers/${driver.id}`} className="text-sm font-medium text-primary hover:underline">
                    Profile
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
