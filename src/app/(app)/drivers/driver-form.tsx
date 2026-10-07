"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { ReactNode } from "react";
import { FormError, FormField, FormSelect, SubmitButton, useActionForm, type ActionFormState } from "@/components/form";
import { vehicleClasses, vehicleClassLabels, type VehicleClass } from "@/domain/fleet";
import { driverInput, updateDriverInput } from "@/domain/people";
import { createDriver, updateDriver } from "@/server/actions/people";

const classOptions = vehicleClasses.map((value) => ({ value, label: vehicleClassLabels[value] }));

type DriverValues = { name: string; phone: string; vehicleClass: VehicleClass };

export function AddDriverForm() {
  const router = useRouter();
  const form = useActionForm({
    schema: driverInput,
    action: createDriver,
    onSuccess: (driver) => {
      toast.success(`${driver.name} is added. Add a photo and license next.`);
      router.push(`/drivers/${driver.id}`);
    },
  });
  return <DriverFields form={form} values={{ name: "", phone: "", vehicleClass: "luxury_sedan" }} submitLabel="Add driver" />;
}

export function EditDriverForm({ driverId, values }: { driverId: string; values: DriverValues }) {
  const router = useRouter();
  const form = useActionForm({
    schema: updateDriverInput,
    action: updateDriver,
    onSuccess: (driver) => {
      toast.success(`${driver.name} is updated.`);
      router.refresh();
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
    <form onSubmit={form.onSubmit} method="post" noValidate className="space-y-1 rounded-2xl border bg-card p-4 sm:p-6">
      {children}
      <FormField label="Full name" name="name" defaultValue={values.name} autoComplete="off" errors={form.fieldErrors.name} />
      <FormField label="Phone" name="phone" type="tel" defaultValue={values.phone} autoComplete="off" errors={form.fieldErrors.phone} />
      <FormSelect label="Drives" name="vehicleClass" options={classOptions} defaultValue={values.vehicleClass} errors={form.fieldErrors.vehicleClass} />
      <div className="space-y-3 pt-1">
        <FormError message={form.formError} />
        <SubmitButton pending={form.pending}>{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}
