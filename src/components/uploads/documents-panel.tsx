"use client";

import { FileText } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useFormat } from "@/components/format";
import { EmptyState } from "@/components/states";
import { FilePicker } from "@/components/uploads/file-picker";
import { useUpload } from "@/components/uploads/use-upload";
import { Button } from "@/components/ui/button";
import { documentContentTypes, maxDocumentBytes } from "@/domain/fleet";
import type { DocumentRow, UploadPurpose } from "@/domain/uploads";
import { deleteDocument } from "@/server/actions/uploads";

export function DocumentsPanel({
  title,
  purpose,
  ownerId,
  documents,
}: {
  title: string;
  purpose: Exclude<UploadPurpose, "driver_photo">;
  ownerId: string;
  documents: DocumentRow[];
}) {
  const router = useRouter();
  const format = useFormat();
  const upload = useUpload(purpose, ownerId);
  const panel = useRef<HTMLElement>(null);
  return (
    <section
      ref={panel}
      tabIndex={-1}
      aria-label={title}
      className="space-y-3 rounded-2xl border bg-card p-4 outline-none focus-visible:ring-3 focus-visible:ring-ring sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">{title}</h2>
          <p className="text-xs text-muted-foreground">
            PDF or image, up to {format.fileSize(maxDocumentBytes)}. Only signed in staff can open these.
          </p>
        </div>
        <FilePicker
          label={`Upload ${title.toLowerCase().replace(/s$/, "")}`}
          accept={documentContentTypes.join(",")}
          pending={upload.isPending}
          onPick={(file) => {
            upload.mutate(file);
          }}
        />
      </div>
      {documents.length === 0 ? (
        <EmptyState title={`No ${title.toLowerCase()} on file`} description="Upload a scan or photo to keep it with the record." />
      ) : (
        <ul aria-label={title} className="divide-y rounded-xl border">
          {documents.map((document) => (
            <li key={document.id} className="flex flex-wrap items-center gap-3 p-3">
              <FileText className="size-5 shrink-0 text-muted-foreground" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{document.fileName}</span>
                <span className="block text-xs text-muted-foreground">
                  {format.fileSize(document.sizeBytes)} · added {format.shortDay(document.uploadedAt)}
                </span>
              </span>
              <Button asChild size="sm" variant="ghost">
                <a href={`/api/documents/${document.id}`} target="_blank" rel="noreferrer" aria-label={`View ${document.fileName}`}>
                  View
                </a>
              </Button>
              <ConfirmDialog
                trigger={
                  <Button size="sm" variant="ghost" className="text-muted-foreground" aria-label={`Delete ${document.fileName}`}>
                    Delete
                  </Button>
                }
                title={`Delete ${document.fileName}?`}
                description="The file is removed from storage for good. This cannot be undone."
                confirmLabel="Delete file"
                onConfirm={() => deleteDocument({ documentId: document.id })}
                returnFocus={() => panel.current}
                onConfirmed={() => {
                  toast.success(`${document.fileName} is deleted.`);
                  router.refresh();
                }}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
