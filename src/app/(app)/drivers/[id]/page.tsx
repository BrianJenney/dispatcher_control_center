import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { DriverProfileView } from "@/app/(app)/drivers/[id]/driver-profile-view";
import { LoadingState } from "@/components/states";
import { getDriverProfile } from "@/server/queries/people";

export const metadata: Metadata = { title: "Driver · Dispatch Lite" };

export default function DriverPage({ params }: PageProps<"/drivers/[id]">) {
  return (
    <Suspense fallback={<LoadingState label="Loading the driver" rows={6} />}>
      <DriverProfile params={params} />
    </Suspense>
  );
}

async function DriverProfile({ params }: Pick<PageProps<"/drivers/[id]">, "params">) {
  await connection();
  const driver = await getDriverProfile((await params).id);
  if (!driver) notFound();
  return <DriverProfileView initialData={driver} />;
}
