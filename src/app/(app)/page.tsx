import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { DashboardView } from "@/app/(app)/dashboard-view";
import { KpiTileSkeleton } from "@/components/kpi-tile";
import { PageHeader } from "@/components/page-header";
import { LoadingState } from "@/components/states";
import { Button } from "@/components/ui/button";
import { getDashboard } from "@/server/queries/dashboard";

export const metadata: Metadata = { title: "Dashboard · Dispatch Lite" };

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        eyebrow="Live dispatch"
        title="Today at a glance"
        actions={
          <Button asChild>
            <Link href="/jobs/new">
              <Plus aria-hidden />
              New trip
            </Link>
          </Button>
        }
      />
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardData />
      </Suspense>
    </>
  );
}

async function DashboardData() {
  return <DashboardView initialData={await getDashboard()} />;
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <p className="-mt-4 h-5 lg:-mt-6" />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <KpiTileSkeleton key={index} />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <LoadingState label="Loading trips that need a driver" rows={3} shape="card" />
        <LoadingState label="Loading trips on the road" rows={3} shape="card" />
      </div>
    </div>
  );
}
