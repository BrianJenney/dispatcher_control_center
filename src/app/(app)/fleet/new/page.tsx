import type { Metadata } from "next";
import { AddVehicleForm } from "@/app/(app)/fleet/vehicle-form";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Add vehicle · Dispatch Lite" };

export default function NewVehiclePage() {
  return (
    <div className="max-w-xl">
      <PageHeader eyebrow="Fleet" title="Add a vehicle" description="New vehicles start as ready to dispatch." />
      <AddVehicleForm />
    </div>
  );
}
