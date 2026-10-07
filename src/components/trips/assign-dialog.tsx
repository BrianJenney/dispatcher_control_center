"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useFormat } from "@/components/format";
import { readJson } from "@/components/live-query";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { useTripMove, useTripReassign } from "@/components/trips/use-trip-move";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { vehicleClassLabels } from "@/domain/fleet";
import { driverSuggestions } from "@/domain/jobs";
import type { TripRow } from "@/domain/trip-row";

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("");
}

export function AssignDialog({ trip }: { trip: TripRow }) {
  const format = useFormat();
  const [open, setOpen] = useState(false);
  const move = useTripMove();
  const reassign = useTripReassign();
  const reassigning = trip.status === "assigned";
  const suggestions = useQuery({
    queryKey: ["suggestions", trip.id],
    queryFn: () => readJson(`/api/trips/${trip.id}/suggestions`, driverSuggestions),
    enabled: open,
    staleTime: 0,
  });
  const choices = (suggestions.data?.suggestions ?? []).filter((driver) => driver.id !== trip.driver?.id);

  function choose(driver: { id: string; name: string }) {
    setOpen(false);
    if (reassigning) {
      reassign.mutate({ tripId: trip.id, reference: trip.reference, driver });
      return;
    }
    move.mutate({ tripId: trip.id, from: "offer", to: "assigned", driverId: driver.id, driver, reference: trip.reference });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant={reassigning ? "outline" : "default"}>
          {reassigning ? "Reassign" : "Assign driver"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {reassigning ? "Reassign" : "Assign"} trip #{trip.reference}
          </DialogTitle>
          <DialogDescription>
            {format.time(trip.pickupAt)} pickup for {trip.customerName}, {vehicleClassLabels[trip.vehicleClass]}. Best
            matches are on duty, drive this class, are free then, and have the fewest trips that day.
          </DialogDescription>
        </DialogHeader>
        {suggestions.isPending ? (
          <LoadingState label="Finding the best drivers" rows={3} />
        ) : suggestions.isError ? (
          <ErrorState description="We could not load driver suggestions." onRetry={() => void suggestions.refetch()} />
        ) : choices.length === 0 ? (
          <EmptyState
            title="No driver fits right now"
            description={
              suggestions.data.onDutyInClass === 0
                ? `Nobody who drives a ${vehicleClassLabels[trip.vehicleClass]} is on duty. Put a driver on duty to assign this trip.`
                : "Every on duty driver in this class already has a trip at that time."
            }
          />
        ) : (
          <ul aria-label="Suggested drivers" className="divide-y rounded-xl border">
            {choices.map((driver, index) => (
              <li key={driver.id} className="flex items-center gap-3 p-3">
                <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-secondary text-sm font-semibold">
                  {initials(driver.name)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{driver.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {driver.tripsToday === 0 ? "No trips that day yet" : `${String(driver.tripsToday)} trips that day`}
                    {index === 0 ? " · Best match" : ""}
                  </span>
                </span>
                <Button
                  size="sm"
                  autoFocus={index === 0}
                  aria-label={`Assign ${driver.name}`}
                  onClick={() => {
                    choose(driver);
                  }}
                >
                  Assign
                </Button>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
