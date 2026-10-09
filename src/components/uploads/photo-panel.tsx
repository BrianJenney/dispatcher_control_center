"use client";

import type { ReactNode } from "react";
import { FilePicker } from "@/components/uploads/file-picker";
import { useUpload } from "@/components/uploads/use-upload";
import { photoContentTypes, type PhotoPurpose } from "@/domain/uploads";

export function PhotoPanel({
  purpose,
  ownerId,
  hasPhoto,
  preview,
  shownHint,
  missingHint,
}: {
  purpose: PhotoPurpose;
  ownerId: string;
  hasPhoto: boolean;
  preview: ReactNode;
  shownHint: string;
  missingHint: string;
}) {
  const upload = useUpload(purpose, ownerId);
  return (
    <section aria-label="Photo" className="flex items-center gap-4 rounded-2xl border bg-card p-4 sm:p-6">
      {preview}
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">{hasPhoto ? shownHint : missingHint}</p>
        <FilePicker
          label={hasPhoto ? "Change photo" : "Upload photo"}
          accept={photoContentTypes.join(",")}
          pending={upload.isPending}
          onPick={(file) => {
            upload.mutate(file);
          }}
        />
      </div>
    </section>
  );
}
