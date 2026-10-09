"use client";

import { EditVehicleForm } from "@/app/(app)/fleet/vehicle-form";
import { useLiveQuery } from "@/components/live-query";
import { PageHeader } from "@/components/page-header";
import { VehicleStatusSwitch } from "@/components/people/vehicle-status-switch";
import { liveQueries } from "@/components/queries";
import { LiveUpdatesPaused } from "@/components/states";
import { DocumentsPanel } from "@/components/uploads/documents-panel";
import type { VehicleProfile } from "@/domain/people";

export function VehicleDetailsView({ initialData }: { initialData: VehicleProfile }) {
  const { data: vehicle, isError, refetch } = useLiveQuery(liveQueries.vehicle(initialData.id), initialData);
  return (
    <>
      <PageHeader eyebrow={`Fleet · ${vehicle.unitNumber}`} title={vehicle.model} actions={<VehicleStatusSwitch vehicle={vehicle} />} />
      <div className="space-y-6">
        {isError ? <LiveUpdatesPaused what="this vehicle" onRetry={() => void refetch()} /> : null}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <EditVehicleForm vehicleId={vehicle.id} values={vehicle} />
          <DocumentsPanel title="Registrations" purpose="vehicle_registration" ownerId={vehicle.id} documents={vehicle.documents} />
        </div>
      </div>
    </>
  );
}
