"use client";

import { useMutation } from "@tanstack/react-query";
import { useId, useRef, useState, type ReactNode, type SubmitEvent } from "react";
import { unreachableMessage } from "@/components/form";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/domain/result";

type ConfirmDialogProps = {
  trigger: ReactNode;
  title: string;
  description: string;
  confirmLabel: string;
  confirmVariant?: "destructive" | "default";
  keepLabel?: string;
  onConfirm: (form: FormData) => Promise<ActionResult<unknown>>;
  onConfirmed?: () => void;
  returnFocus?: () => HTMLElement | null;
  children?: ReactNode;
};

export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel,
  confirmVariant = "destructive",
  keepLabel = "Keep it",
  onConfirm,
  onConfirmed,
  returnFocus,
  children,
}: ConfirmDialogProps) {
  const formId = useId();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({ mutationFn: onConfirm });
  const pending = mutation.isPending;
  const inFlight = useRef(false);

  function confirm(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    inFlight.current = true;
    mutation.mutate(new FormData(event.currentTarget), {
      onSettled: () => {
        inFlight.current = false;
      },
      onError: () => {
        setError(unreachableMessage);
      },
      onSuccess: (result) => {
        if (!result.ok) {
          setError(result.message);
          return;
        }
        setOpen(false);
        onConfirmed?.();
      },
    });
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        setError(null);
      }}
    >
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent
        onCloseAutoFocus={(event) => {
          const target = returnFocus?.();
          if (!target) return;
          event.preventDefault();
          target.focus();
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <form id={formId} onSubmit={confirm} noValidate className="space-y-3">
          {children}
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </form>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>{keepLabel}</AlertDialogCancel>
          <Button type="submit" form={formId} variant={confirmVariant} aria-disabled={pending} aria-busy={pending}>
            {pending ? "Working…" : confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
