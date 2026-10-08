"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useFormat } from "@/components/format";
import { useLiveQuery } from "@/components/live-query";
import { liveQueries } from "@/components/queries";
import { EmptyState, LiveUpdatesPaused } from "@/components/states";
import { StatusBadge } from "@/components/trips/status-badge";
import { Button } from "@/components/ui/button";
import { describeActivity, type ActivityFilter, type ActivitySnapshot } from "@/domain/activity";
import { maxShown, nextShownCount } from "@/domain/paging";

export function ActivityView({ filter, initialData }: { filter: ActivityFilter; initialData: ActivitySnapshot }) {
  const router = useRouter();
  const [loading, startLoading] = useTransition();
  const format = useFormat();
  const { data, isError, refetch } = useLiveQuery(liveQueries.activity(filter.show), initialData);
  const nextShow = nextShownCount(filter.show);

  return (
    <div className="space-y-5">
      {isError ? <LiveUpdatesPaused what="the activity log" onRetry={() => void refetch()} /> : null}
      {data.entries.length === 0 ? (
        <EmptyState title="No activity yet" description="Booking, assigning and moving trips will be recorded here." />
      ) : (
        <ol aria-label="Activity" className="divide-y rounded-xl border bg-card">
          {data.entries.map((entry) => (
            <li key={entry.id} className="flex items-start justify-between gap-3 p-3 sm:p-4">
              <div className="min-w-0 space-y-0.5">
                <p className="text-sm">
                  <span className="font-medium">{entry.actorName}</span> {describeActivity(entry)}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  #{entry.reference} {entry.customerName}
                </p>
                <p className="text-xs text-muted-foreground">
                  <time dateTime={entry.createdAt}>
                    {format.shortDay(entry.createdAt)}, {format.time(entry.createdAt)}
                  </time>
                </p>
              </div>
              <StatusBadge status={entry.toStatus} />
            </li>
          ))}
        </ol>
      )}
      {data.hasMore && nextShow === null ? (
        <p className="text-sm text-muted-foreground">Showing the newest {maxShown} changes.</p>
      ) : null}
      {data.hasMore && nextShow !== null ? (
        <Button
          variant="outline" className="w-full sm:w-auto"
          aria-disabled={loading}
          onClick={() => {
            startLoading(() => {
              router.replace(`/activity?show=${String(nextShow)}`, { scroll: false });
            });
          }}
        >
          Show more
        </Button>
      ) : null}
    </div>
  );
}
