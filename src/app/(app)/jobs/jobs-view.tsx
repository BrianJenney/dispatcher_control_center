"use client";

import { Search } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useRef, useTransition } from "react";
import { useLiveQuery } from "@/components/live-query";
import { liveQueries } from "@/components/queries";
import { EmptyState, LiveUpdatesPaused } from "@/components/states";
import { TripActions } from "@/components/trips/trip-actions";
import { TripCard } from "@/components/trips/trip-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/components/ui/utils";
import { jobsPageSize, jobsSearch, type JobsFilter, type JobsSnapshot } from "@/domain/jobs";
import { statusLabels, tripStatuses } from "@/domain/trip-status";

const statusTabs = [{ value: null, label: "All" }, ...tripStatuses.map((value) => ({ value, label: statusLabels[value] }))];

function jobsHref(filter: JobsFilter): Route {
  const search = jobsSearch(filter);
  return search ? `/jobs?${search}` : "/jobs";
}

export function JobsView({ filter, initialData }: { filter: JobsFilter; initialData: JobsSnapshot }) {
  const router = useRouter();
  const [navigating, startNavigation] = useTransition();
  const typing = useRef<ReturnType<typeof setTimeout>>(undefined);
  const search = jobsSearch(filter);
  const { data, isError, refetch } = useLiveQuery(liveQueries.jobs(search), initialData);

  function show(next: JobsFilter) {
    startNavigation(() => {
      router.replace(jobsHref(next), { scroll: false });
    });
  }

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            type="search"
            aria-label="Search by customer"
            placeholder="Search by customer"
            defaultValue={filter.q}
            className="pl-9"
            onChange={(event) => {
              const q = event.currentTarget.value;
              clearTimeout(typing.current);
              typing.current = setTimeout(() => {
                show({ ...filter, q, show: jobsPageSize });
              }, 300);
            }}
          />
        </div>
        <div role="group" aria-label="Filter by status" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
          {statusTabs.map((tab) => {
            const selected = filter.status === tab.value;
            return (
              <Button
                key={tab.label}
                size="sm"
                variant={selected ? "default" : "outline"}
                aria-pressed={selected}
                className="shrink-0 rounded-full"
                onClick={() => {
                  show({ ...filter, status: tab.value, show: jobsPageSize });
                }}
              >
                {tab.label}
              </Button>
            );
          })}
        </div>
      </div>
      {isError ? (
        <LiveUpdatesPaused what="the jobs list" onRetry={() => void refetch()} />
      ) : null}
      <div aria-busy={navigating} className={cn("transition-opacity", navigating && "opacity-60")}>
        {data.trips.length === 0 ? (
          filter.q || filter.status ? (
            <EmptyState
              title="No trips match"
              description={filter.q ? `Nothing found for "${filter.q}". Check the spelling or try another status.` : "No trips have this status yet."}
              action={
                <Button
                  variant="outline"
                  onClick={() => {
                    show({ q: "", status: null, show: jobsPageSize });
                  }}
                >
                  Show all jobs
                </Button>
              }
            />
          ) : (
            <EmptyState title="No trips yet" description="Book the first trip to see it here." />
          )
        ) : (
          <ul aria-label="Jobs" className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {data.trips.map((trip) => (
              <li key={trip.id}>
                <TripCard trip={trip} showDate actions={<TripActions trip={trip} />} />
              </li>
            ))}
          </ul>
        )}
      </div>
      {data.hasMore ? (
        <Button
          variant="outline"
          className="w-full sm:w-auto"
          disabled={navigating}
          onClick={() => {
            show({ ...filter, show: filter.show + jobsPageSize });
          }}
        >
          Show more
        </Button>
      ) : null}
    </div>
  );
}
