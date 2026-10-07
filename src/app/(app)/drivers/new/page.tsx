import type { Metadata } from "next";
import { AddDriverForm } from "@/app/(app)/drivers/driver-form";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Add driver · Dispatch Lite" };

export default function NewDriverPage() {
  return (
    <div className="max-w-xl">
      <PageHeader eyebrow="Team" title="Add a driver" description="New drivers start off duty. Add their photo and license on the next screen." />
      <AddDriverForm />
    </div>
  );
}
