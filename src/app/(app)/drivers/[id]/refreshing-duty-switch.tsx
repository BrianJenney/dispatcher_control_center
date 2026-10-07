"use client";

import { useRouter } from "next/navigation";
import { DutySwitch } from "@/components/people/duty-switch";

export function RefreshingDutySwitch({ driver }: { driver: { id: string; name: string; onDuty: boolean } }) {
  const router = useRouter();
  return (
    <DutySwitch
      driver={driver}
      onChanged={() => {
        router.refresh();
      }}
    />
  );
}
