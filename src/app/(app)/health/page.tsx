import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { HealthPanel } from "@/app/health/health-panel";
import { LoadingState } from "@/components/states";
import { getHealthSnapshot } from "@/server/queries/health";

export const metadata: Metadata = { title: "System health · Dispatch Lite" };

export default function HealthPage() {
  return (
    <main className="mx-auto w-full max-w-xl space-y-6 px-4 py-8 sm:px-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">System health</h1>
        <p className="text-sm text-muted-foreground">
          Confirms the app can read from and write to the database.
        </p>
      </header>
      <Suspense fallback={<LoadingState label="Checking the database" rows={3} />}>
        <HealthData />
      </Suspense>
    </main>
  );
}

async function HealthData() {
  await connection();
  return <HealthPanel initialData={await getHealthSnapshot()} />;
}
