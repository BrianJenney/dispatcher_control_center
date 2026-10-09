import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { CreateTripForm } from "@/app/(app)/jobs/trip-form";
import { PageHeader } from "@/components/page-header";
import { LoadingState } from "@/components/states";
import { defaultTripValues } from "@/server/queries/trip-editor";

export const metadata: Metadata = { title: "New trip · Dispatch Lite" };

export default function NewTripPage() {
  return (
    <>
      <PageHeader eyebrow="Jobs" title="Book a trip" description="It starts as an offer until a driver is assigned." />
      <Suspense fallback={<LoadingState label="Preparing the form" rows={6} />}>
        <NewTripForm />
      </Suspense>
    </>
  );
}

async function NewTripForm() {
  await connection();
  return <CreateTripForm values={await defaultTripValues()} />;
}
