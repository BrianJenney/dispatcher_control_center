import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { VehicleProfileView } from "@/app/(app)/fleet/[id]/vehicle-profile-view";
import { LoadingState } from "@/components/states";
import { getVehicleProfile } from "@/server/queries/people";

export const metadata: Metadata = { title: "Vehicle · Dispatch Lite" };

export default function VehiclePage({ params }: PageProps<"/fleet/[id]">) {
  return (
    <Suspense fallback={<LoadingState label="Loading the vehicle" rows={6} />}>
      <VehicleProfileData params={params} />
    </Suspense>
  );
}

async function VehicleProfileData({ params }: Pick<PageProps<"/fleet/[id]">, "params">) {
  const vehicle = await getVehicleProfile((await params).id);
  if (!vehicle) notFound();
  return <VehicleProfileView initialData={vehicle} />;
}
