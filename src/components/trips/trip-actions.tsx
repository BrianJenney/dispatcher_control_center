"use client";

import Link from "next/link";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { AssignDialog } from "@/components/trips/assign-dialog";
import { useTripMove } from "@/components/trips/use-trip-move";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { isEditable } from "@/domain/assignment";
import { failure, type ActionResult } from "@/domain/result";
import type { TripRow } from "@/domain/trip-row";
import { isFinal, nextStep, tripMessages } from "@/domain/trip-status";

export function TripActions({ trip }: { trip: TripRow }) {
  const move = useTripMove();
  const step = nextStep[trip.status];

  async function cancel(form: FormData): Promise<ActionResult<unknown>> {
    const entry = form.get("reason");
    const reason = typeof entry === "string" ? entry.trim() : "";
    if (!reason) return failure(tripMessages.cancelReasonRequired);
    return move.mutateAsync({ tripId: trip.id, from: trip.status, to: "cancelled", reason, reference: trip.reference });
  }

  return (
    <div className="grid w-full gap-2 sm:flex sm:flex-wrap">
      {step ? (
        <Button
          size="sm"
          className="h-11 sm:h-8"
          disabled={move.isPending}
          onClick={() => {
            move.mutate({ tripId: trip.id, from: trip.status, to: step.to, reference: trip.reference });
          }}
        >
          {step.label}
        </Button>
      ) : null}
      {trip.status === "offer" ? <AssignDialog trip={trip} /> : null}
      <div className="grid auto-cols-fr grid-flow-col gap-2 empty:hidden sm:contents">
      {trip.status === "assigned" ? <AssignDialog trip={trip} /> : null}
      {isEditable(trip.status) ? (
        <Button asChild size="sm" variant="outline" className="h-11 sm:h-8">
          <Link href={`/jobs/${trip.id}/edit`} aria-label={`Edit trip ${String(trip.reference)}`}>
            Edit
          </Link>
        </Button>
      ) : null}
      {isFinal(trip.status) ? null : (
        <ConfirmDialog
          trigger={
            <Button size="sm" variant="outline" className="h-11 text-muted-foreground sm:h-8">
              Cancel trip
            </Button>
          }
          title={`Cancel trip #${String(trip.reference)}?`}
          description={`${trip.customerName}'s booking will be marked cancelled. This cannot be undone.`}
          confirmLabel="Cancel trip"
          keepLabel="Keep trip"
          onConfirm={cancel}
        >
          <div className="grid gap-2">
            <Label htmlFor={`cancel-reason-${trip.id}`}>Reason for cancelling</Label>
            <Textarea
              id={`cancel-reason-${trip.id}`}
              name="reason"
              maxLength={200}
              placeholder="For example, the client's flight was cancelled"
            />
          </div>
        </ConfirmDialog>
      )}
      </div>
    </div>
  );
}
