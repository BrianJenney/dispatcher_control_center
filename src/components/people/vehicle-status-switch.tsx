"use client";

import { fleetQueryKey, tripsQueryKey } from "@/components/queries";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useOptimisticAction } from "@/components/use-optimistic-action";
import { vehicleStatusLabels, type VehicleStatus } from "@/domain/fleet";
import { withVehicleStatus, type VehicleData } from "@/domain/people";
import { setVehicleStatus } from "@/server/actions/people";

type StatusRequest = { vehicleId: string; unitNumber: string; status: VehicleStatus };

export function VehicleStatusSwitch({ vehicle }: { vehicle: { id: string; unitNumber: string; status: VehicleStatus } }) {
  const change = useOptimisticAction<StatusRequest, VehicleData>({
    queryKey: fleetQueryKey,
    action: (request) => setVehicleStatus({ vehicleId: request.vehicleId, status: request.status }),
    update: (data, request) => withVehicleStatus(data, request.vehicleId, request.status),
    done: (request) => `${request.unitNumber} is ${vehicleStatusLabels[request.status].toLowerCase()}.`,
    alsoRefresh: [tripsQueryKey],
  });
  const id = `ready-${vehicle.id}`;
  return (
    <div className="flex items-center gap-2">
      <Switch
        id={id}
        checked={vehicle.status === "ready"}
        aria-disabled={change.isPending}
        aria-label={`${vehicle.unitNumber} ready`}
        onCheckedChange={(ready) => {
          if (change.isPending) return;
          change.mutate({ vehicleId: vehicle.id, unitNumber: vehicle.unitNumber, status: ready ? "ready" : "in_service" });
        }}
      />
      <Label htmlFor={id} className="text-sm font-normal text-muted-foreground">
        {vehicleStatusLabels[vehicle.status]}
      </Label>
    </div>
  );
}
