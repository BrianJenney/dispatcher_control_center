"use client";

import { DriverPhotoPanel } from "@/app/(app)/drivers/[id]/driver-photo";
import { EditDriverForm } from "@/app/(app)/drivers/driver-form";
import { useLiveQuery } from "@/components/live-query";
import { PageHeader } from "@/components/page-header";
import { DutySwitch } from "@/components/people/duty-switch";
import { liveQueries } from "@/components/queries";
import { LiveUpdatesPaused } from "@/components/states";
import { DocumentsPanel } from "@/components/uploads/documents-panel";
import type { DriverProfile } from "@/domain/people";

export function DriverProfileView({ initialData }: { initialData: DriverProfile }) {
  const { data: driver, isError, refetch } = useLiveQuery(liveQueries.driver(initialData.id), initialData);
  return (
    <>
      <PageHeader eyebrow="Driver" title={driver.name} actions={<DutySwitch driver={driver} />} />
      <div className="space-y-6">
        {isError ? <LiveUpdatesPaused what="this driver" onRetry={() => void refetch()} /> : null}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="space-y-6">
            <DriverPhotoPanel driver={driver} />
            <EditDriverForm driverId={driver.id} values={driver} />
          </div>
          <DocumentsPanel title="Licenses" purpose="driver_license" ownerId={driver.id} documents={driver.documents} />
        </div>
      </div>
    </>
  );
}
