"use client";

import { DriverAvatar } from "@/components/people/driver-avatar";
import { FilePicker } from "@/components/uploads/file-picker";
import { useUpload } from "@/components/uploads/use-upload";
import { photoContentTypes } from "@/domain/uploads";

export function DriverPhotoPanel({ driver }: { driver: { id: string; name: string; photoVersion: string | null } }) {
  const upload = useUpload("driver_photo", driver.id);
  return (
    <section aria-label="Photo" className="flex items-center gap-4 rounded-2xl border bg-card p-4 sm:p-6">
      <DriverAvatar driver={driver} size={72} />
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          {driver.photoVersion ? "This photo shows on the drivers list." : "No photo yet. A clear head and shoulders shot works best."}
        </p>
        <FilePicker
          label={driver.photoVersion ? "Change photo" : "Upload photo"}
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
