import { Suspense } from "react";
import { AppShell } from "@/components/shell/app-shell";
import { SidebarUserMenuSkeleton, UserMenu } from "@/components/shell/user-menu";
import { requireUser } from "@/server/query";

export default function SignedInLayout({ children }: LayoutProps<"/">) {
  return (
    <AppShell
      sidebarMenu={
        <Suspense fallback={<SidebarUserMenuSkeleton />}>
          <SignedInUserMenu tone="light" />
        </Suspense>
      }
      headerMenu={
        <Suspense>
          <SignedInUserMenu tone="dark" />
        </Suspense>
      }
    >
      {children}
    </AppShell>
  );
}

async function SignedInUserMenu({ tone }: { tone: "dark" | "light" }) {
  return <UserMenu user={await requireUser()} tone={tone} />;
}
