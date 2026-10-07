import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { HealthPanel } from "@/app/(app)/health/health-panel";
import { PageHeader } from "@/components/page-header";
import { LoadingState } from "@/components/states";
import { getHealthSnapshot } from "@/server/queries/health";

export const metadata: Metadata = { title: "System health · Dispatch Lite" };

export default function HealthPage() {
  return (
    <div className="max-w-xl">
      <PageHeader title="System health" description="Confirms the app can read from and write to the database." />
      <Suspense fallback={<LoadingState label="Checking the database" rows={3} />}>
        <HealthData />
      </Suspense>
    </div>
  );
}

async function HealthData() {
  await connection();
  return <HealthPanel initialData={await getHealthSnapshot()} />;
}
