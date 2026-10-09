import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { ScheduleView } from "@/app/(app)/schedule/schedule-view";
import { PageHeader } from "@/components/page-header";
import { LoadingState } from "@/components/states";
import { getSchedule } from "@/server/queries/schedule";

export const metadata: Metadata = { title: "Schedule · Dispatch Lite" };

export default function SchedulePage() {
  return (
    <>
      <PageHeader eyebrow="Today" title="Schedule" description="Who is driving when, from first pickup to last drop off." />
      <Suspense fallback={<LoadingState label="Loading today's schedule" rows={5} />}>
        <ScheduleData />
      </Suspense>
    </>
  );
}

async function ScheduleData() {
  await connection();
  return <ScheduleView initialData={await getSchedule()} />;
}
