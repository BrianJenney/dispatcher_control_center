"use client";

import { useRouter } from "next/navigation";
import { FormError, FormField, SubmitButton, useActionForm } from "@/components/form";
import { isAppRoute } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { signInInput } from "@/domain/auth";
import { signIn } from "@/server/actions/auth";

type LoginFormProps = { next: string; demo: { email: string; password: string } };

export function LoginForm({ next, demo }: LoginFormProps) {
  const router = useRouter();
  const form = useActionForm({
    schema: signInInput,
    action: signIn,
    onSuccess: () => {
      router.replace(isAppRoute(next) ? next : "/");
    },
  });

  function fillDemo() {
    const fields = document.forms.namedItem("sign-in");
    const email = fields?.elements.namedItem("email");
    const password = fields?.elements.namedItem("password");
    if (email instanceof HTMLInputElement) email.value = demo.email;
    if (password instanceof HTMLInputElement) password.value = demo.password;
    fields?.requestSubmit();
  }

  return (
    <div className="space-y-6">
      <form name="sign-in" method="post" onSubmit={form.onSubmit} noValidate className="space-y-1">
        <FormField label="Email" name="email" type="email" autoComplete="username" errors={form.fieldErrors.email} />
        <FormField
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          errors={form.fieldErrors.password}
        />
        <div className="space-y-3 pt-1">
          <FormError message={form.formError} />
          <SubmitButton pending={form.pending} pendingLabel="Signing in…" className="w-full">
            Sign in
          </SubmitButton>
        </div>
      </form>
      <div className="rounded-xl border border-dashed bg-accent/40 p-4 text-sm">
        <p className="font-medium text-accent-foreground">Trying it out?</p>
        <p className="mt-1 text-muted-foreground">
          Use the demo dispatcher account: <span className="font-medium text-foreground">{demo.email}</span>
        </p>
        <Button type="button" variant="outline" className="mt-3 w-full" onClick={fillDemo} disabled={form.pending}>
          Sign in with the demo account
        </Button>
      </div>
    </div>
  );
}
