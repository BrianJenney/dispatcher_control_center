"use client";

import { Upload } from "lucide-react";
import { useId, useRef } from "react";
import { Button } from "@/components/ui/button";

export function FilePicker({
  label,
  accept,
  pending,
  onPick,
}: {
  label: string;
  accept: string;
  pending: boolean;
  onPick: (file: File) => void;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={input}
        id={id}
        type="file"
        accept={accept}
        className="sr-only"
        tabIndex={-1}
        aria-label={label}
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = "";
          if (file) onPick(file);
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pending}
        aria-busy={pending}
        onClick={() => input.current?.click()}
      >
        <Upload aria-hidden />
        {pending ? "Uploading…" : label}
      </Button>
    </>
  );
}
