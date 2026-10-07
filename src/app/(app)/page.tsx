import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Dashboard · Dispatch Lite" };

export default function DashboardPage() {
  return <PageHeader eyebrow="Today" title="Dashboard" description="Everything moving today, at a glance." />;
}
