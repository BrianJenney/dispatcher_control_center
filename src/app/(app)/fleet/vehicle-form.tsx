"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { FormError, FormField, FormSelect, SubmitButton, useActionForm, type ActionFormState } from "@/components/form";
import { vehicleClassOptions, type VehicleClass } from "@/domain/fleet";
import { updateVehicleInput, vehicleInput } from "@/domain/people";
import { createVehicle, updateVehicle } from "@/server/actions/people";


type VehicleValues = { model: string; unitNumber: string; plate: string; vehicleClass: VehicleClass };

export function AddVehicleForm() {
  const router = useRouter();
  const form = useActionForm({
    schema: vehicleInput,
    action: createVehicle,
    onSuccess: (vehicle) => {
      toast.success(`${vehicle.unitNumber} is added and ready. Add its registration next.`);
      router.push(`/fleet/${vehicle.id}`);
    },
  });
  return (
    <VehicleFields form={form} values={{ model: "", unitNumber: "", plate: "", vehicleClass: "luxury_sedan" }} submitLabel="Add vehicle" />
  );
}

export function EditVehicleForm({ vehicleId, values }: { vehicleId: string; values: VehicleValues }) {
  const router = useRouter();
  const form = useActionForm({
    schema: updateVehicleInput,
    action: updateVehicle,
    onSuccess: (vehicle) => {
      toast.success(`${vehicle.unitNumber} is updated.`);
      router.refresh();
    },
  });
  return (
    <VehicleFields form={form} values={values} submitLabel="Save changes">
      <input type="hidden" name="vehicleId" value={vehicleId} />
    </VehicleFields>
  );
}

function VehicleFields({
  form,
  values,
  submitLabel,
  children,
}: {
  form: ActionFormState;
  values: VehicleValues;
  submitLabel: string;
  children?: ReactNode;
}) {
  return (
    <form onSubmit={form.onSubmit} method="post" noValidate className="space-y-1 rounded-2xl border bg-card p-4 sm:p-6">
      {children}
      <FormField label="Make and model" name="model" defaultValue={values.model} autoComplete="off" errors={form.fieldErrors.model} />
      <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
        <FormField label="Fleet number" name="unitNumber" defaultValue={values.unitNumber} autoComplete="off" errors={form.fieldErrors.unitNumber} />
        <FormField label="Plate" name="plate" defaultValue={values.plate} autoComplete="off" errors={form.fieldErrors.plate} />
      </div>
      <FormSelect label="Class" name="vehicleClass" options={vehicleClassOptions} defaultValue={values.vehicleClass} errors={form.fieldErrors.vehicleClass} />
      <div className="space-y-3 pt-1">
        <FormError message={form.formError} />
        <SubmitButton pending={form.pending}>{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}
