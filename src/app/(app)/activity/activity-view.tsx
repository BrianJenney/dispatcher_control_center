"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { ActivityList } from "@/components/activity-list";
import { useLiveQuery } from "@/components/live-query";
import { liveQueries } from "@/components/queries";
import { EmptyState, LiveUpdatesPaused } from "@/components/states";
import { Button } from "@/components/ui/button";
import type { ActivityFilter, ActivitySnapshot } from "@/domain/activity";
import { maxShown, nextShownCount } from "@/domain/paging";

export function ActivityView({ filter, initialData }: { filter: ActivityFilter; initialData: ActivitySnapshot }) {
  const router = useRouter();
  const [loading, startLoading] = useTransition();
  const { data, isError, refetch } = useLiveQuery(liveQueries.activity(filter.show), initialData);
  const nextShow = nextShownCount(filter.show);

  return (
    <div className="space-y-5">
      {isError ? <LiveUpdatesPaused what="the activity log" onRetry={() => void refetch()} /> : null}
      {data.entries.length === 0 ? (
        <EmptyState title="No activity yet" description="Booking, editing, assigning and moving trips will be recorded here." />
      ) : (
        <ActivityList label="Activity" entries={data.entries} linkToTrip />
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
