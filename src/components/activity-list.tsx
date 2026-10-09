"use client";

import { PencilLine } from "lucide-react";
import { useFormat } from "@/components/format";
import { StatusBadge } from "@/components/trips/status-badge";
import { Badge } from "@/components/ui/badge";
import { describeActivity, type ActivityEntry } from "@/domain/activity";

export function ActivityList({ label, entries }: { label: string; entries: readonly ActivityEntry[] }) {
  const format = useFormat();
  const historyFormat = { money: format.money, moment: (iso: string) => `${format.shortDay(iso)}, ${format.time(iso)}` };
  return (
    <ol aria-label={label} className="divide-y rounded-xl border bg-card">
      {entries.map((entry) => (
        <li key={entry.id} className="flex items-start justify-between gap-3 p-3 sm:p-4">
          <div className="min-w-0 space-y-0.5">
            <p className="text-sm break-words">
              <span className="font-medium">{entry.actorName}</span> {describeActivity(entry, historyFormat)}
            </p>
            <p className="truncate text-xs text-muted-foreground">{entry.customerName}</p>
            <p className="text-xs text-muted-foreground">
              <time dateTime={entry.createdAt}>
                {format.shortDay(entry.createdAt)}, {format.time(entry.createdAt)}
              </time>
            </p>
          </div>
          {entry.kind === "move" ? (
            <StatusBadge status={entry.toStatus} />
          ) : (
            <Badge variant="outline">
              <PencilLine aria-hidden />
              Edited
            </Badge>
          )}
        </li>
      ))}
    </ol>
  );
}
