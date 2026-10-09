import type { Metadata } from "next";
import { Suspense } from "react";
import { ScheduleView } from "@/app/(app)/schedule/schedule-view";
import { PageHeader } from "@/components/page-header";
import { LoadingState } from "@/components/states";
import { scheduleFilter } from "@/domain/schedule";
import { getSchedule } from "@/server/queries/schedule";

export const metadata: Metadata = { title: "Schedule · Dispatch Lite" };

export default function SchedulePage({ searchParams }: PageProps<"/schedule">) {
  return (
    <>
      <PageHeader eyebrow="Today" title="Schedule" description="Who is driving when, from first pickup to last drop off." />
      <Suspense fallback={<LoadingState label="Loading today's schedule" rows={5} />}>
        <ScheduleData searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function ScheduleData({ searchParams }: Pick<PageProps<"/schedule">, "searchParams">) {
  const filter = scheduleFilter.parse(await searchParams);
  return <ScheduleView filter={filter} initialData={await getSchedule()} />;
}
