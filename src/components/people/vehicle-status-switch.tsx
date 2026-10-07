"use client";

import { fleetQueryKey, tripsQueryKey } from "@/components/queries";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useOptimisticAction } from "@/components/use-optimistic-action";
import { vehicleStatusLabels, type VehicleStatus } from "@/domain/fleet";
import type { VehicleRow } from "@/domain/people";
import { setVehicleStatus } from "@/server/actions/people";

type StatusRequest = { vehicleId: string; unitNumber: string; status: VehicleStatus };

export function VehicleStatusSwitch({
  vehicle,
  onChanged,
}: {
  vehicle: { id: string; unitNumber: string; status: VehicleStatus };
  onChanged?: () => void;
}) {
  const change = useOptimisticAction<StatusRequest, { vehicles: VehicleRow[] }>({
    queryKey: fleetQueryKey,
    action: (request) => setVehicleStatus({ vehicleId: request.vehicleId, status: request.status }),
    update: (data, request) => ({
      vehicles: data.vehicles.map((item) => (item.id === request.vehicleId ? { ...item, status: request.status } : item)),
    }),
    done: (request) => `${request.unitNumber} is ${vehicleStatusLabels[request.status].toLowerCase()}.`,
    alsoRefresh: [tripsQueryKey],
  });
  const id = `ready-${vehicle.id}`;
  return (
    <div className="flex items-center gap-2">
      <Switch
        id={id}
        checked={vehicle.status === "ready"}
        disabled={change.isPending}
        aria-label={`${vehicle.unitNumber} ready`}
        onCheckedChange={(ready) => {
          change.mutate(
            { vehicleId: vehicle.id, unitNumber: vehicle.unitNumber, status: ready ? "ready" : "in_service" },
            { onSettled: onChanged },
          );
        }}
      />
      <Label htmlFor={id} className="text-sm font-normal text-muted-foreground">
        {vehicleStatusLabels[vehicle.status]}
      </Label>
    </div>
  );
}
