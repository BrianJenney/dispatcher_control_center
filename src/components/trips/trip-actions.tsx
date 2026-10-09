"use client";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { useFormat } from "@/components/format";
import { RecordLink } from "@/components/record-link";
import { AssignDialog } from "@/components/trips/assign-dialog";
import { useTripMove } from "@/components/trips/use-trip-move";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { isEditable } from "@/domain/assignment";
import { failure, type ActionResult } from "@/domain/result";
import type { TripRow } from "@/domain/trip-row";
import { isFinal, nextStep, tripMessages } from "@/domain/trip-status";

type TripMove = ReturnType<typeof useTripMove>;

function CompleteTrip({ trip, move, label }: { trip: TripRow; move: TripMove; label: string }) {
  const format = useFormat();
  const revenueDay = format.isToday(trip.pickupAt) ? "today's revenue" : `revenue for ${format.shortDay(trip.pickupAt)}`;

  function complete(): Promise<ActionResult<unknown>> {
    return move.mutateAsync({ tripId: trip.id, from: trip.status, to: "completed", reference: trip.reference });
  }

  return (
    <ConfirmDialog
      trigger={
        <Button
          size="sm"
          aria-disabled={move.isPending}
          onClick={(event) => {
            if (move.isPending) event.preventDefault();
          }}
        >
          {label}
        </Button>
      }
      title={`Complete trip #${String(trip.reference)}?`}
      description={`${trip.customerName}'s ${format.money(trip.fareCents)} fare will count toward ${revenueDay}. This cannot be undone.`}
      confirmLabel="Complete trip"
      confirmVariant="default"
      keepLabel="Not yet"
      onConfirm={complete}
    />
  );
}

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
      {step?.to === "completed" ? (
        <CompleteTrip trip={trip} move={move} label={step.label} />
      ) : step ? (
        <Button
          size="sm"
          aria-disabled={move.isPending}
          onClick={() => {
            if (move.isPending) return;
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
        <Button asChild size="sm" variant="outline">
          <RecordLink href={`/jobs/${trip.id}/edit`} aria-label={`Edit trip ${String(trip.reference)}`}>
            Edit
          </RecordLink>
        </Button>
      ) : null}
      {isFinal(trip.status) ? null : (
        <ConfirmDialog
          trigger={
            <Button size="sm" variant="outline" className="text-muted-foreground">
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
