import type { Metadata } from "next";
import { connection } from "next/server";
import Link from "next/link";
import { Suspense } from "react";
import { InsightsView } from "@/app/(app)/insights/insights-view";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { LoadingState } from "@/components/states";
import { getInsights } from "@/server/queries/insights";

export const metadata: Metadata = { title: "Insights · Dispatch Lite" };

export default function InsightsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Operations"
        title="Insights"
        description="The last seven days, and anything that needs a dispatcher right now."
        actions={
          <Button asChild variant="outline">
            <Link href="/activity">Activity log</Link>
          </Button>
        }
      />
      <Suspense fallback={<LoadingState label="Loading insights" rows={4} />}>
        <InsightsData />
      </Suspense>
    </>
  );
}

async function InsightsData() {
  await connection();
  return <InsightsView initialData={await getInsights()} />;
}
