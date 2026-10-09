"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { ReactNode } from "react";
import { ActionForm, FormError, FormField, FormSelect, FormSwitch, SubmitButton, useActionForm, type ActionFormState } from "@/components/form";
import { driversQueryKey, tripsQueryKey } from "@/components/queries";
import { vehicleClassOptions, type VehicleClass } from "@/domain/fleet";
import { newDriverInput, updateDriverInput } from "@/domain/people";
import { createDriver, updateDriver } from "@/server/actions/people";

type DriverValues = { name: string; phone: string; vehicleClass: VehicleClass };

export function AddDriverForm() {
  const router = useRouter();
  const form = useActionForm({
    schema: newDriverInput,
    action: createDriver,
    onSuccess: (driver) => {
      toast.success(`${driver.name} is added. Add a photo and license next.`);
      router.push(`/drivers/${driver.id}`);
    },
  });
  return (
    <DriverFields form={form} values={{ name: "", phone: "", vehicleClass: "luxury_sedan" }} submitLabel="Add driver">
      <FormSwitch label="Start on duty" hint="Can take trips right away." name="onDuty" defaultChecked={false} />
    </DriverFields>
  );
}

export function EditDriverForm({ driverId, values }: { driverId: string; values: DriverValues }) {
  const queryClient = useQueryClient();
  const form = useActionForm({
    schema: updateDriverInput,
    action: updateDriver,
    onSuccess: (driver) => {
      toast.success(`${driver.name} is updated.`);
      void queryClient.invalidateQueries({ queryKey: driversQueryKey });
      void queryClient.invalidateQueries({ queryKey: tripsQueryKey });
    },
  });
  return (
    <DriverFields form={form} values={values} submitLabel="Save changes">
      <input type="hidden" name="driverId" value={driverId} />
    </DriverFields>
  );
}

function DriverFields({
  form,
  values,
  submitLabel,
  children,
}: {
  form: ActionFormState;
  values: DriverValues;
  submitLabel: string;
  children?: ReactNode;
}) {
  return (
    <ActionForm form={form} className="space-y-1 rounded-2xl border bg-card p-4 sm:p-6">
      <FormField label="Full name" name="name" defaultValue={values.name} autoComplete="off" errors={form.fieldErrors.name} />
      <FormField label="Phone" name="phone" type="tel" defaultValue={values.phone} autoComplete="off" errors={form.fieldErrors.phone} />
      <FormSelect label="Drives" name="vehicleClass" options={vehicleClassOptions} defaultValue={values.vehicleClass} errors={form.fieldErrors.vehicleClass} />
      {children}
      <div className="space-y-3 pt-1">
        <FormError message={form.formError} />
        <SubmitButton pending={form.pending}>{submitLabel}</SubmitButton>
      </div>
    </ActionForm>
  );
}
