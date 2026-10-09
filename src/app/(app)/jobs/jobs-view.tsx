"use client";

import { Download, Search } from "lucide-react";
import type { Route } from "next";
import { useEffect, useRef } from "react";
import { useLiveQuery } from "@/components/live-query";
import { liveQueries } from "@/components/queries";
import { EmptyState, LiveUpdatesPaused } from "@/components/states";
import { StatusFilter } from "@/components/trips/status-filter";
import { TripActions } from "@/components/trips/trip-actions";
import { TripCard } from "@/components/trips/trip-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/components/ui/utils";
import { useAddressFilter } from "@/components/use-address-filter";
import { jobsSearch, jobsSearchId, jobsSearchLabel, tripReferenceIn, type JobsFilter, type JobsSnapshot } from "@/domain/jobs";
import { maxShown, nextShownCount, pageSize } from "@/domain/paging";

function jobsHref(filter: JobsFilter): Route {
  const search = jobsSearch(filter);
  return search ? `/jobs?${search}` : "/jobs";
}

function exportHref(filter: JobsFilter): string {
  const params = new URLSearchParams();
  if (filter.q) params.set("q", filter.q);
  if (filter.status) params.set("status", filter.status);
  const search = params.toString();
  return search ? `/api/jobs/export?${search}` : "/api/jobs/export";
}

function noMatchHint(q: string): string {
  const check = tripReferenceIn(q) === null ? "the spelling" : "the trip number";
  return `Nothing found for "${q}". Check ${check} or try another status.`;
}

export function JobsView({ filter, initialData }: { filter: JobsFilter; initialData: JobsSnapshot }) {
  const { shown, show, pending: navigating } = useAddressFilter(filter, jobsHref);
  const typing = useRef<ReturnType<typeof setTimeout>>(undefined);
  const searchBox = useRef<HTMLInputElement>(null);
  const search = jobsSearch(filter);
  const { data, isError, refetch } = useLiveQuery(liveQueries.jobs(search), initialData);
  const nextShow = nextShownCount(filter.show);

  useEffect(() => {
    const box = searchBox.current;
    if (box && document.activeElement !== box) box.value = filter.q;
  }, [filter.q]);

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            ref={searchBox}
            id={jobsSearchId}
            type="search"
            aria-label={jobsSearchLabel}
            placeholder={jobsSearchLabel}
            defaultValue={filter.q}
            className="pl-9"
            onChange={(event) => {
              const q = event.currentTarget.value;
              clearTimeout(typing.current);
              typing.current = setTimeout(() => {
                show({ ...shown, q, show: pageSize });
              }, 300);
            }}
          />
        </div>
        <div className="flex justify-end">
          <Button asChild variant="outline" size="sm">
            <a href={exportHref(filter)} download>
              <Download aria-hidden />
              Export CSV
            </a>
          </Button>
        </div>
        <StatusFilter
          value={shown.status}
          onChange={(status) => {
            show({ ...shown, status, show: pageSize });
          }}
        />
      </div>
      {isError ? (
        <LiveUpdatesPaused what="the jobs list" onRetry={() => void refetch()} />
      ) : null}
      <div aria-busy={navigating} className={cn("transition-opacity", navigating && "opacity-60")}>
        {data.trips.length === 0 ? (
          filter.q || filter.status ? (
            <EmptyState
              title="No trips match"
              description={filter.q ? noMatchHint(filter.q) : "No trips have this status yet."}
              action={
                <Button
                  variant="outline"
                  onClick={() => {
                    if (searchBox.current) searchBox.current.value = "";
                    searchBox.current?.focus();
                    show({ q: "", status: null, show: pageSize });
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
        nextShow === null ? (
          <p className="text-sm text-muted-foreground">
            Showing the newest {maxShown}. Search by customer, address, driver or trip number, or pick a status, to find older trips.
          </p>
        ) : (
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            aria-disabled={navigating}
            onClick={() => {
              show({ ...shown, show: nextShow });
            }}
          >
            Show more
          </Button>
        )
      ) : null}
    </div>
  );
}
