import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { ActivityView } from "@/app/(app)/activity/activity-view";
import { PageHeader } from "@/components/page-header";
import { LoadingState } from "@/components/states";
import { activityFilter } from "@/domain/activity";
import { getActivity } from "@/server/queries/activity";

export const metadata: Metadata = { title: "Activity · Dispatch Lite" };

export default function ActivityPage({ searchParams }: PageProps<"/activity">) {
  return (
    <>
      <PageHeader eyebrow="Operations" title="Activity" description="Who changed which trip, and when. Newest first." />
      <Suspense fallback={<LoadingState label="Loading activity" rows={6} />}>
        <ActivityData searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function ActivityData({ searchParams }: Pick<PageProps<"/activity">, "searchParams">) {
  await connection();
  const filter = activityFilter.parse(await searchParams);
  return <ActivityView key={filter.show} filter={filter} initialData={await getActivity(filter)} />;
}
