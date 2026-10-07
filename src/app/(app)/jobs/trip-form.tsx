"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { ReactNode } from "react";
import { FormError, FormField, FormSelect, SubmitButton, useActionForm, type ActionFormState } from "@/components/form";
import { Button } from "@/components/ui/button";
import { mostSeatsInAnyClass, vehicleClassOptions, type VehicleClass } from "@/domain/fleet";
import { jobsPageSize, jobsSearch } from "@/domain/jobs";
import { durationOptions, tripInput, updateTripInput } from "@/domain/trip-form";
import { createTrip, updateTrip } from "@/server/actions/trips";

export type TripFormValues = {
  customerName: string;
  pickupAddress: string;
  dropoffAddress: string;
  pickupDate: string;
  pickupTime: string;
  durationMinutes: number;
  passengers: number;
  vehicleClass: VehicleClass;
  fare: string;
};

const durationLabels = durationOptions.map((minutes) => ({
  value: String(minutes),
  label: minutes < 60 ? `${String(minutes)} minutes` : `${String(minutes / 60)} ${minutes === 60 ? "hour" : "hours"}`,
}));

type Saved = { id: string; reference: number; customerName: string };

function useSaved(message: (trip: Saved) => string) {
  const router = useRouter();
  return (trip: Saved) => {
    toast.success(message(trip));
    router.push(`/jobs?${jobsSearch({ q: trip.customerName, status: null, show: jobsPageSize })}`);
  };
}

export function CreateTripForm({ values }: { values: TripFormValues }) {
  const onSuccess = useSaved((trip) => `Trip #${String(trip.reference)} is booked and waiting for a driver.`);
  const form = useActionForm({ schema: tripInput, action: createTrip, onSuccess });
  return <TripFields form={form} values={values} submitLabel="Book trip" />;
}

export function EditTripForm({ tripId, values }: { tripId: string; values: TripFormValues }) {
  const onSuccess = useSaved((trip) => `Trip #${String(trip.reference)} is updated.`);
  const form = useActionForm({ schema: updateTripInput, action: updateTrip, onSuccess });
  return (
    <TripFields form={form} values={values} submitLabel="Save changes">
      <input type="hidden" name="tripId" value={tripId} />
    </TripFields>
  );
}

function TripFields({
  form,
  values,
  submitLabel,
  children,
}: {
  form: ActionFormState;
  values: TripFormValues;
  submitLabel: string;
  children?: ReactNode;
}) {
  const router = useRouter();
  const errors = form.fieldErrors;
  return (
    <form onSubmit={form.onSubmit} method="post" noValidate className="max-w-2xl space-y-2">
      {children}
      <fieldset className="grid grid-cols-1 gap-x-4 rounded-2xl border bg-card p-4 sm:p-6">
        <legend className="px-1 text-sm font-semibold">Customer and route</legend>
        <FormField label="Customer" name="customerName" defaultValue={values.customerName} autoComplete="off" errors={errors.customerName} />
        <FormField label="Pickup" name="pickupAddress" defaultValue={values.pickupAddress} autoComplete="off" errors={errors.pickupAddress} />
        <FormField label="Drop-off" name="dropoffAddress" defaultValue={values.dropoffAddress} autoComplete="off" errors={errors.dropoffAddress} />
      </fieldset>
      <fieldset className="grid grid-cols-1 gap-x-4 rounded-2xl border bg-card p-4 sm:grid-cols-3 sm:p-6">
        <legend className="px-1 text-sm font-semibold">When</legend>
        <FormField label="Date" name="pickupDate" type="date" defaultValue={values.pickupDate} errors={errors.pickupDate} />
        <FormField label="Pickup time" name="pickupTime" type="time" step={300} defaultValue={values.pickupTime} errors={errors.pickupTime} />
        <FormSelect
          label="Trip length"
          name="durationMinutes"
          options={durationLabels}
          defaultValue={String(values.durationMinutes)}
          errors={errors.durationMinutes}
        />
      </fieldset>
      <fieldset className="grid grid-cols-1 gap-x-4 rounded-2xl border bg-card p-4 sm:grid-cols-3 sm:p-6">
        <legend className="px-1 text-sm font-semibold">Vehicle and fare</legend>
        <FormSelect label="Vehicle class" name="vehicleClass" options={vehicleClassOptions} defaultValue={values.vehicleClass} errors={errors.vehicleClass} />
        <FormField
          label="Passengers"
          name="passengers"
          type="number"
          inputMode="numeric"
          min={1}
          max={mostSeatsInAnyClass}
          defaultValue={values.passengers}
          errors={errors.passengers}
        />
        <FormField label="Fare in dollars" name="fare" inputMode="decimal" placeholder="185" defaultValue={values.fare} errors={errors.fare} />
      </fieldset>
      <div className="space-y-3 pt-2">
        <FormError message={form.formError} />
        <div className="flex flex-wrap gap-2">
          <SubmitButton pending={form.pending}>{submitLabel}</SubmitButton>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              router.back();
            }}
          >
            Discard
          </Button>
        </div>
      </div>
    </form>
  );
}
