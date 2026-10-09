import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LoginForm } from "@/app/login/login-form";
import { Brand } from "@/components/shell/brand";
import { isAppRoute } from "@/components/navigation";
import { LoadingState } from "@/components/states";
import { safeRedirectPath } from "@/domain/auth";
import { currentUser } from "@/server/session";

export const metadata: Metadata = { title: "Sign in · Dispatch Lite" };

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <aside
        aria-label="About Dispatch Lite"
        className="relative hidden overflow-hidden bg-sidebar p-12 text-sidebar-foreground lg:flex lg:flex-col lg:justify-between">
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,color-mix(in_oklch,var(--gold)_22%,transparent),transparent_55%),radial-gradient(circle_at_80%_90%,color-mix(in_oklch,var(--sidebar-accent)_90%,transparent),transparent_60%)]"
        />
        <Brand tone="light" className="relative" />
        <div className="relative max-w-md space-y-4">
          <p className="text-xs font-semibold tracking-[0.2em] text-gold uppercase">Dispatch, refined</p>
          <p className="text-3xl leading-tight font-semibold">Every pickup on time. Every chauffeur in the right car.</p>
          <p className="text-sidebar-foreground/70">
            See the day at a glance, assign the right driver in a click, and follow each trip to the door.
          </p>
        </div>
      </aside>
      <main className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-sm space-y-8">
          <Brand className="lg:hidden" />
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold">Sign in</h1>
            <p className="text-sm text-muted-foreground">Welcome back. Sign in to run today&apos;s dispatch.</p>
          </div>
          <div className="min-h-[16rem]">
            <Suspense fallback={<LoadingState label="Preparing sign in" rows={4} />}>
              <SignInPanel searchParams={searchParams} />
            </Suspense>
          </div>
        </div>
      </main>
    </div>
  );
}

async function SignInPanel({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  const next = safeRedirectPath.parse((await searchParams).next);
  if (await currentUser()) redirect(isAppRoute(next) && next !== "/login" ? next : "/");
  return <LoginForm next={next} />;
}
