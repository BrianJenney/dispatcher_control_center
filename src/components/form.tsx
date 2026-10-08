"use client";

import { useMutation } from "@tanstack/react-query";
import { useId, useRef, useState, type ComponentProps, type SubmitEvent } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ActionResult, FieldErrors } from "@/domain/result";

export const unreachableMessage = "We could not reach the server. Check your connection and try again.";

export type ActionFormState = {
  onSubmit: (event: SubmitEvent<HTMLFormElement>) => void;
  pending: boolean;
  formError: string | null;
  fieldErrors: FieldErrors;
};

type ActionForm<S extends z.ZodType, R> = {
  schema: S;
  action: (input: z.output<S>) => Promise<ActionResult<R>>;
  onSuccess?: (data: R) => void;
};

export function useActionForm<S extends z.ZodType, R>({ schema, action, onSuccess }: ActionForm<S, R>): ActionFormState {
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const mutation = useMutation({ mutationFn: action });
  const inFlight = useRef(false);

  function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    const form = event.currentTarget;
    const parsed = schema.safeParse(Object.fromEntries(new FormData(form)));
    if (!parsed.success) {
      setFormError(null);
      setFieldErrors(z.flattenError(parsed.error).fieldErrors);
      return;
    }
    inFlight.current = true;
    mutation.mutate(parsed.data, {
      onSettled: () => {
        inFlight.current = false;
      },
      onError: () => {
        setFormError(unreachableMessage);
      },
      onSuccess: (result) => {
        if (!result.ok) {
          setFormError(result.message);
          setFieldErrors(result.fieldErrors);
          return;
        }
        setFormError(null);
        setFieldErrors({});
        form.reset();
        onSuccess?.(result.data);
      },
    });
  }

  return { onSubmit, pending: mutation.isPending, formError, fieldErrors };
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

export function FormSelect({
  label,
  name,
  options,
  defaultValue,
  errors,
}: {
  label: string;
  name: string;
  options: readonly { value: string; label: string }[];
  defaultValue: string;
  errors?: string[];
}) {
  const id = useId();
  const errorId = `${id}-error`;
  const error = errors?.[0];
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Select name={name} defaultValue={defaultValue}>
        <SelectTrigger
          id={id}
          className="w-full"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
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

export function SubmitButton({
  pending,
  children,
  pendingLabel = "Saving…",
  className,
  disabled = false,
}: {
  pending: boolean;
  children: string;
  pendingLabel?: string;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <Button type="submit" disabled={disabled} aria-disabled={pending} aria-busy={pending} className={className}>
      {pending ? pendingLabel : children}
    </Button>
  );
}
