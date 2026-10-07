import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { z } from "zod";
import { RefreshingStatusSwitch } from "@/app/(app)/fleet/[id]/refreshing-status-switch";
import { EditVehicleForm } from "@/app/(app)/fleet/vehicle-form";
import { PageHeader } from "@/components/page-header";
import { LoadingState } from "@/components/states";
import { DocumentsPanel } from "@/components/uploads/documents-panel";
import { getVehicleProfile } from "@/server/queries/people";

export const metadata: Metadata = { title: "Vehicle · Dispatch Lite" };

export default function VehiclePage({ params }: PageProps<"/fleet/[id]">) {
  return (
    <Suspense fallback={<LoadingState label="Loading the vehicle" rows={6} />}>
      <VehicleProfile params={params} />
    </Suspense>
  );
}

async function VehicleProfile({ params }: Pick<PageProps<"/fleet/[id]">, "params">) {
  await connection();
  const id = z.uuid().safeParse((await params).id);
  const vehicle = id.success ? await getVehicleProfile(id.data) : null;
  if (!vehicle) notFound();
  return (
    <>
      <PageHeader
        eyebrow={`Fleet · ${vehicle.unitNumber}`}
        title={vehicle.model}
        actions={<RefreshingStatusSwitch vehicle={vehicle} />}
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <EditVehicleForm vehicleId={vehicle.id} values={vehicle} />
        <DocumentsPanel title="Registrations" purpose="vehicle_registration" ownerId={vehicle.id} documents={vehicle.documents} />
      </div>
    </>
  );
}
