import { z } from "zod";
import { documentContentTypes, maxDocumentBytes } from "@/domain/fleet";

export const uploadPurposes = ["driver_license", "vehicle_registration", "driver_photo"] as const;
export type UploadPurpose = (typeof uploadPurposes)[number];

export const photoContentTypes = ["image/jpeg", "image/png", "image/webp"] as const;

const allowed: Record<UploadPurpose, readonly string[]> = {
  driver_license: documentContentTypes,
  vehicle_registration: documentContentTypes,
  driver_photo: photoContentTypes,
};

const wrongType: Record<UploadPurpose, string> = {
  driver_license: "Upload a PDF or an image (JPEG, PNG or WebP).",
  vehicle_registration: "Upload a PDF or an image (JPEG, PNG or WebP).",
  driver_photo: "Use a JPEG, PNG or WebP photo.",
};

const fileFields = z.object({
  purpose: z.enum(uploadPurposes),
  ownerId: z.uuid(),
  fileName: z.string().trim().min(1, "The file needs a name.").max(200, "Rename the file to 200 characters or fewer."),
  contentType: z.string(),
  sizeBytes: z.number().int().min(1, "That file is empty.").max(maxDocumentBytes, "Files must be 10 MB or smaller."),
});

function typeCheck(file: z.output<typeof fileFields>, context: z.RefinementCtx) {
  if (!allowed[file.purpose].includes(file.contentType)) {
    context.addIssue({ code: "custom", path: ["contentType"], message: wrongType[file.purpose] });
  }
}

export const uploadRequest = fileFields.superRefine(typeCheck);

export const savedUpload = fileFields.extend({ key: z.string().min(1) }).superRefine(typeCheck);

export function uploadProblem(purpose: UploadPurpose, file: { type: string; size: number; name: string }): string | null {
  const result = uploadRequest.safeParse({
    purpose,
    ownerId: "00000000-0000-4000-8000-000000000000",
    fileName: file.name,
    contentType: file.type,
    sizeBytes: file.size,
  });
  return result.success ? null : (result.error.issues[0]?.message ?? "That file cannot be uploaded.");
}

export function storageKey(purpose: UploadPurpose, ownerId: string, uploadId: string, fileName: string): string {
  const safeName = fileName.replace(/[^\w.-]+/g, "-").replace(/^-+|-+$/g, "").slice(-120) || "file";
  return `${purpose}/${ownerId}/${uploadId}/${safeName}`;
}

export function uploadIdOf(key: string | null): string | null {
  return key?.split("/")[2] ?? null;
}

export function keyBelongsTo(key: string, purpose: UploadPurpose, ownerId: string): boolean {
  return key.startsWith(`${purpose}/${ownerId}/`) && !key.split("/").includes("..");
}

export const documentRow = z.object({
  id: z.uuid(),
  fileName: z.string(),
  contentType: z.string(),
  sizeBytes: z.number().int(),
  uploadedAt: z.iso.datetime({ offset: true }),
});

export type DocumentRow = z.infer<typeof documentRow>;
