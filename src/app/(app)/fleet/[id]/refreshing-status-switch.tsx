"use client";

import { useRouter } from "next/navigation";
import { VehicleStatusSwitch } from "@/components/people/vehicle-status-switch";
import type { VehicleStatus } from "@/domain/fleet";

export function RefreshingStatusSwitch({ vehicle }: { vehicle: { id: string; unitNumber: string; status: VehicleStatus } }) {
  const router = useRouter();
  return (
    <VehicleStatusSwitch
      vehicle={vehicle}
      onChanged={() => {
        router.refresh();
      }}
    />
  );
}
