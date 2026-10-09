import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { TripDetailView } from "@/app/(app)/jobs/[id]/trip-detail-view";
import { LoadingState } from "@/components/states";
import { getTripDetail } from "@/server/queries/trip-detail";

export const metadata: Metadata = { title: "Trip · Dispatch Lite" };

export default function TripPage({ params }: PageProps<"/jobs/[id]">) {
  return (
    <Suspense fallback={<LoadingState label="Loading the trip" rows={6} />}>
      <TripDetailData params={params} />
    </Suspense>
  );
}

async function TripDetailData({ params }: Pick<PageProps<"/jobs/[id]">, "params">) {
  const detail = await getTripDetail((await params).id);
  if (!detail) notFound();
  return <TripDetailView initialData={detail} />;
}
