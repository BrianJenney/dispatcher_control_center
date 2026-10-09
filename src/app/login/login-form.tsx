"use client";

import { useRouter } from "next/navigation";
import { ActionForm, FormError, FormField, SubmitButton, useActionForm } from "@/components/form";
import { isAppRoute } from "@/components/navigation";
import { signInInput } from "@/domain/auth";
import { signIn } from "@/server/actions/auth";

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const form = useActionForm({
    schema: signInInput,
    action: signIn,
    onSuccess: () => {
      router.replace(isAppRoute(next) ? next : "/");
    },
  });

  return (
    <ActionForm form={form} className="space-y-1">
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
    </ActionForm>
  );
}
