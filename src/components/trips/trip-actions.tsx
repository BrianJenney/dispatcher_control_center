"use client";

import type { ReactNode } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useTripMove } from "@/components/trips/use-trip-move";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult } from "@/domain/result";
import type { TripRow } from "@/domain/trip-row";
import { isFinal, nextStep, tripMessages } from "@/domain/trip-status";

export function TripActions({ trip, assign }: { trip: TripRow; assign?: ReactNode }) {
  const move = useTripMove();
  const step = nextStep[trip.status];

  async function cancel(form: FormData): Promise<ActionResult<unknown>> {
    const entry = form.get("reason");
    const reason = typeof entry === "string" ? entry.trim() : "";
    if (!reason) return { ok: false, message: tripMessages.cancelReasonRequired, fieldErrors: {} };
    return move.mutateAsync({ tripId: trip.id, from: trip.status, to: "cancelled", reason, reference: trip.reference });
  }

  return (
    <>
      {trip.status === "offer" ? assign : null}
      {step ? (
        <Button
          size="sm"
          disabled={move.isPending}
          onClick={() => {
            move.mutate({ tripId: trip.id, from: trip.status, to: step.to, reference: trip.reference });
          }}
        >
          {step.label}
        </Button>
      ) : null}
      {isFinal(trip.status) ? null : (
        <ConfirmDialog
          trigger={
            <Button size="sm" variant="ghost" className="text-muted-foreground">
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
    </>
  );
}
