import type { ReactNode } from "react";
import { Brand } from "@/components/shell/brand";
import { BottomNav, SidebarNav } from "@/components/shell/nav";
import { KeyboardShortcuts } from "@/components/shortcuts";
import { GuidedTour } from "@/components/tour";

export function AppShell({
  sidebarMenu,
  headerMenu,
  children,
}: {
  sidebarMenu: ReactNode;
  headerMenu: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
      <a
        href="#content"
        className="sr-only z-50 rounded-md bg-primary px-3 py-2 text-primary-foreground outline-none focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus-visible:ring-3 focus-visible:ring-ring"
      >
        Skip to content
      </a>
      <aside className="sticky top-0 hidden h-dvh min-h-0 flex-col bg-sidebar py-6 text-sidebar-foreground lg:flex">
        <div className="min-h-0 flex-1 space-y-8 overflow-y-auto">
          <Brand tone="light" className="px-6" />
          <SidebarNav />
        </div>
        <div className="mx-3 shrink-0 border-t border-sidebar-border px-3 pt-4">
          {sidebarMenu}
        </div>
      </aside>
      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/90 px-4 backdrop-blur lg:hidden">
          <Brand />
          {headerMenu}
        </header>
        <main id="content" tabIndex={-1} className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-24 outline-none sm:px-6 lg:px-10 lg:pt-10 lg:pb-12">
          {children}
        </main>
      </div>
      <BottomNav />
      <GuidedTour />
      <KeyboardShortcuts />
    </div>
  );
}
