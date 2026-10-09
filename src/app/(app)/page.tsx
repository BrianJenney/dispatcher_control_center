import type { Metadata } from "next";
import { Suspense } from "react";
import { DashboardView } from "@/app/(app)/dashboard-view";
import { KpiTileSkeleton } from "@/components/kpi-tile";
import { PageHeader } from "@/components/page-header";
import { LoadingState } from "@/components/states";
import { getDashboard } from "@/server/queries/dashboard";

export const metadata: Metadata = { title: "Dashboard · Dispatch Lite" };

export default function DashboardPage() {
  return (
    <>
      <PageHeader eyebrow="Live dispatch" title="Today at a glance" />
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
        <LoadingState label="Loading trips that need a driver" rows={3} />
        <LoadingState label="Loading trips on the road" rows={3} />
      </div>
    </div>
  );
}
