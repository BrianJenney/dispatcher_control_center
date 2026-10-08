import type { ReactNode } from "react";
import { Brand } from "@/components/shell/brand";

export function StandalonePage({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 px-4 py-10 sm:px-8">
      <Brand />
      <div className="w-full max-w-md">{children}</div>
    </main>
  );
}
