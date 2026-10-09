import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { EditTripForm } from "@/app/(app)/jobs/trip-form";
import { PageHeader } from "@/components/page-header";
import { EmptyState, LoadingState } from "@/components/states";
import { Button } from "@/components/ui/button";
import { isEditable } from "@/domain/assignment";
import { getTripForEditing } from "@/server/queries/trip-editor";

export const metadata: Metadata = { title: "Edit trip · Dispatch Lite" };

export default function EditTripPage({ params }: PageProps<"/jobs/[id]/edit">) {
  return (
    <Suspense fallback={<LoadingState label="Loading the trip" rows={6} />}>
      <EditTrip params={params} />
    </Suspense>
  );
}

async function EditTrip({ params }: Pick<PageProps<"/jobs/[id]/edit">, "params">) {
  const trip = await getTripForEditing((await params).id);
  if (!trip) notFound();
  return (
    <>
      <PageHeader eyebrow="Jobs" title={`Edit trip #${String(trip.reference)}`} />
      {isEditable(trip.status) ? (
        <EditTripForm tripId={trip.tripId} values={trip} />
      ) : (
        <EmptyState
          title="This trip can no longer be edited"
          description="Trips that are en route, completed or cancelled keep their details as they were."
          action={
            <Button asChild variant="outline">
              <Link href="/jobs">Back to jobs</Link>
            </Button>
          }
        />
      )}
    </>
  );
}
