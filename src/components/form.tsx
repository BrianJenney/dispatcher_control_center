"use client";

import { useId, useState, useTransition, type ComponentProps, type SubmitEvent } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionResult, FieldErrors } from "@/domain/result";

const unreachable = "We could not reach the server. Check your connection and try again.";

type ActionForm<S extends z.ZodType, R> = {
  schema: S;
  action: (input: z.output<S>) => Promise<ActionResult<R>>;
  onSuccess?: (data: R) => void;
};

export function useActionForm<S extends z.ZodType, R>({ schema, action, onSuccess }: ActionForm<S, R>) {
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [pending, startTransition] = useTransition();

  function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = event.currentTarget;
    const parsed = schema.safeParse(Object.fromEntries(new FormData(form)));
    if (!parsed.success) {
      setFormError(null);
      setFieldErrors(z.flattenError(parsed.error).fieldErrors);
      return;
    }
    startTransition(async () => {
      const result = await action(parsed.data).catch(() => null);
      if (!result) {
        setFormError(unreachable);
        return;
      }
      if (!result.ok) {
        setFormError(result.message);
        setFieldErrors(result.fieldErrors);
        return;
      }
      setFormError(null);
      setFieldErrors({});
      form.reset();
      onSuccess?.(result.data);
    });
  }

  return { onSubmit, pending, formError, fieldErrors };
}

export function FormField({
  label,
  errors,
  ...inputProps
}: { label: string; name: string; errors?: string[] } & ComponentProps<typeof Input>) {
  const id = useId();
  const errorId = `${id}-error`;
  const error = errors?.[0];
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} aria-invalid={error ? true : undefined} aria-describedby={error ? errorId : undefined} {...inputProps} />
      <p id={errorId} className="min-h-5 text-sm text-destructive">
        {error}
      </p>
    </div>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
      {message}
    </p>
  );
}

export function SubmitButton({ pending, children }: { pending: boolean; children: string }) {
  return (
    <Button type="submit" disabled={pending} aria-busy={pending}>
      {pending ? "Saving…" : children}
    </Button>
  );
}
