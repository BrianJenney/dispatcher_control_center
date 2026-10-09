import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { JobsView } from "@/app/(app)/jobs/jobs-view";
import { PageHeader } from "@/components/page-header";
import { LoadingState } from "@/components/states";
import { Button } from "@/components/ui/button";
import { jobsFilter } from "@/domain/jobs";
import { getJobs } from "@/server/queries/jobs";

export const metadata: Metadata = { title: "Jobs · Dispatch Lite" };

export default function JobsPage({ searchParams }: PageProps<"/jobs">) {
  return (
    <>
      <PageHeader
        eyebrow="Bookings"
        title="Jobs"
        description="Every trip from offer to completion. Newest pickups first."
        actions={
          <Button asChild>
            <Link href="/jobs/new">
              <Plus aria-hidden />
              New trip
            </Link>
          </Button>
        }
      />
      <Suspense fallback={<LoadingState label="Loading jobs" rows={6} />}>
        <JobsData searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function JobsData({ searchParams }: Pick<PageProps<"/jobs">, "searchParams">) {
  const filter = jobsFilter.parse(await searchParams);
  return <JobsView filter={filter} initialData={await getJobs(filter)} />;
}
