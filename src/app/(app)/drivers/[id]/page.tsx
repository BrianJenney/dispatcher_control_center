import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { z } from "zod";
import { EditDriverForm } from "@/app/(app)/drivers/driver-form";
import { DriverPhotoPanel } from "@/app/(app)/drivers/[id]/driver-photo";
import { PageHeader } from "@/components/page-header";
import { RefreshingDutySwitch } from "@/app/(app)/drivers/[id]/refreshing-duty-switch";
import { LoadingState } from "@/components/states";
import { DocumentsPanel } from "@/components/uploads/documents-panel";
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
  const id = z.uuid().safeParse((await params).id);
  const driver = id.success ? await getDriverProfile(id.data) : null;
  if (!driver) notFound();
  return (
    <>
      <PageHeader eyebrow="Driver" title={driver.name} actions={<RefreshingDutySwitch driver={driver} />} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <DriverPhotoPanel driver={driver} />
          <EditDriverForm driverId={driver.id} values={driver} />
        </div>
        <DocumentsPanel title="Licenses" purpose="driver_license" ownerId={driver.id} documents={driver.documents} />
      </div>
    </>
  );
}
