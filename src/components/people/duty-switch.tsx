"use client";

import { driversQueryKey, tripsQueryKey } from "@/components/queries";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useOptimisticAction } from "@/components/use-optimistic-action";
import { withDriverOnDuty, type DriverData } from "@/domain/people";
import { setDriverDuty } from "@/server/actions/people";

type DutyRequest = { driverId: string; name: string; onDuty: boolean };

export function useDutyToggle() {
  return useOptimisticAction<DutyRequest, DriverData>({
    queryKey: driversQueryKey,
    action: (request) => setDriverDuty({ driverId: request.driverId, onDuty: request.onDuty }),
    update: (data, request) => withDriverOnDuty(data, request.driverId, request.onDuty),
    done: (request) => `${request.name} is ${request.onDuty ? "on duty" : "off duty"}.`,
    alsoRefresh: [tripsQueryKey],
  });
}

export function DutySwitch({ driver }: { driver: { id: string; name: string; onDuty: boolean } }) {
  const toggle = useDutyToggle();
  const id = `duty-${driver.id}`;
  return (
    <div className="flex items-center gap-2">
      <Switch
        id={id}
        checked={driver.onDuty}
        aria-disabled={toggle.isPending}
        aria-label={`${driver.name} on duty`}
        onCheckedChange={(onDuty) => {
          if (toggle.isPending) return;
          toggle.mutate({ driverId: driver.id, name: driver.name, onDuty });
        }}
      />
      <Label htmlFor={id} className="text-sm font-normal text-muted-foreground">
        {driver.onDuty ? "On duty" : "Off duty"}
      </Label>
    </div>
  );
}
