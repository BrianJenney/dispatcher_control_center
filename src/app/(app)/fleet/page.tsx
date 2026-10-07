import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { FleetView } from "@/app/(app)/fleet/fleet-view";
import { PageHeader } from "@/components/page-header";
import { LoadingState } from "@/components/states";
import { Button } from "@/components/ui/button";
import { getFleet } from "@/server/queries/people";

export const metadata: Metadata = { title: "Fleet · Dispatch Lite" };

export default function FleetPage() {
  return (
    <>
      <PageHeader
        eyebrow="Vehicles"
        title="Fleet"
        description="Which vehicles are ready to dispatch and which are in service."
        actions={
          <Button asChild>
            <Link href="/fleet/new">
              <Plus aria-hidden />
              Add vehicle
            </Link>
          </Button>
        }
      />
      <Suspense fallback={<LoadingState label="Loading the fleet" rows={6} />}>
        <FleetData />
      </Suspense>
    </>
  );
}

async function FleetData() {
  await connection();
  return <FleetView initialData={await getFleet()} />;
}
