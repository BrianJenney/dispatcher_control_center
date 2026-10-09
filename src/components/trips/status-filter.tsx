"use client";

import { Button } from "@/components/ui/button";
import { statusLabels, tripStatuses, type TripStatus } from "@/domain/trip-status";

const statusTabs = [{ value: null, label: "All" }, ...tripStatuses.map((value) => ({ value, label: statusLabels[value] }))];

export function StatusFilter({ value, onChange }: { value: TripStatus | null; onChange: (status: TripStatus | null) => void }) {
  return (
    <div role="group" aria-label="Filter by status" className="-mx-4 -my-1 flex gap-2 overflow-x-auto px-4 py-1 sm:-mx-1 sm:px-1">
      {statusTabs.map((tab) => {
        const selected = value === tab.value;
        return (
          <Button
            key={tab.label}
            size="sm"
            variant={selected ? "default" : "outline"}
            aria-pressed={selected}
            className="shrink-0 rounded-full"
            onClick={() => {
              onChange(tab.value);
            }}
          >
            {tab.label}
          </Button>
        );
      })}
    </div>
  );
}
