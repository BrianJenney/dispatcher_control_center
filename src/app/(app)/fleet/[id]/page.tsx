import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { VehicleDetailsView } from "@/app/(app)/fleet/[id]/vehicle-details-view";
import { LoadingState } from "@/components/states";
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
  const vehicle = await getVehicleProfile((await params).id);
  if (!vehicle) notFound();
  return <VehicleDetailsView initialData={vehicle} />;
}
