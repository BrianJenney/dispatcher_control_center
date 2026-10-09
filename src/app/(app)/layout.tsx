import { Suspense, type ReactNode } from "react";
import { AppShell } from "@/components/shell/app-shell";
import { LoadingState } from "@/components/states";
import { requireUser } from "@/server/query";

export default function SignedInLayout({ children }: LayoutProps<"/">) {
  return (
    <Suspense
      fallback={
        <AppShell user={null}>
          <LoadingState label="Loading your workspace" rows={4} />
        </AppShell>
      }
    >
      <SignedIn>{children}</SignedIn>
    </Suspense>
  );
}

async function SignedIn({ children }: { children: ReactNode }) {
  const user = await requireUser();
  return <AppShell user={user}>{children}</AppShell>;
}
