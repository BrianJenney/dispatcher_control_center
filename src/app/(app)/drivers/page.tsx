import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { DriversView } from "@/app/(app)/drivers/drivers-view";
import { PageHeader } from "@/components/page-header";
import { LoadingState } from "@/components/states";
import { Button } from "@/components/ui/button";
import { getDrivers } from "@/server/queries/people";

export const metadata: Metadata = { title: "Drivers · Dispatch Lite" };

export default function DriversPage() {
  return (
    <>
      <PageHeader
        eyebrow="Team"
        title="Drivers"
        description="Who is on duty, what they drive, and their license on file."
        actions={
          <Button asChild>
            <Link href="/drivers/new">
              <Plus aria-hidden />
              Add driver
            </Link>
          </Button>
        }
      />
      <Suspense fallback={<LoadingState label="Loading drivers" rows={6} />}>
        <DriversData />
      </Suspense>
    </>
  );
}

async function DriversData() {
  await connection();
  return <DriversView initialData={await getDrivers()} />;
}
