import type { ReactNode } from "react";
import { Brand } from "@/components/shell/brand";
import { BottomNav, SidebarNav } from "@/components/shell/nav";
import { UserMenu } from "@/components/shell/user-menu";
import type { SignedInUser } from "@/server/session";

export function AppShell({ user, children }: { user: SignedInUser | null; children: ReactNode }) {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
      <a
        href="#content"
        className="sr-only z-50 rounded-md bg-primary px-3 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <aside className="sticky top-0 hidden h-dvh flex-col justify-between bg-sidebar py-6 text-sidebar-foreground lg:flex">
        <div className="space-y-8">
          <Brand tone="light" className="px-6" />
          <SidebarNav />
        </div>
        <div className="mx-3 border-t border-sidebar-border px-3 pt-4">
          {user ? <UserMenu user={user} tone="light" /> : <div className="h-9" />}
        </div>
      </aside>
      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/90 px-4 backdrop-blur lg:hidden">
          <Brand />
          {user ? <UserMenu user={user} /> : null}
        </header>
        <main id="content" className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-24 sm:px-6 lg:px-10 lg:pt-10 lg:pb-12">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
