import { z } from "zod";
import { documentContentTypes, maxDocumentBytes } from "@/domain/fleet";

export const uploadPurposes = ["driver_license", "vehicle_registration", "driver_photo"] as const;
export type UploadPurpose = (typeof uploadPurposes)[number];

export const photoContentTypes = ["image/jpeg", "image/png", "image/webp"] as const;

type FileContentType = (typeof documentContentTypes)[number];

const anyByte = null;

const fileTypes: Record<FileContentType, { signature: readonly (number | null)[]; extensions: readonly [string, ...string[]] }> = {
  "application/pdf": { signature: [0x25, 0x50, 0x44, 0x46, 0x2d], extensions: ["pdf"] },
  "image/jpeg": { signature: [0xff, 0xd8, 0xff], extensions: ["jpg", "jpeg"] },
  "image/png": { signature: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], extensions: ["png"] },
  "image/webp": {
    signature: [0x52, 0x49, 0x46, 0x46, anyByte, anyByte, anyByte, anyByte, 0x57, 0x45, 0x42, 0x50],
    extensions: ["webp"],
  },
};

export const signatureBytes = Math.max(...Object.values(fileTypes).map((type) => type.signature.length));

function isFileContentType(contentType: string): contentType is FileContentType {
  return Object.hasOwn(fileTypes, contentType);
}

export function contentMatches(contentType: string, firstBytes: Uint8Array): boolean {
  if (!isFileContentType(contentType)) return false;
  const { signature } = fileTypes[contentType];
  return firstBytes.length >= signature.length && signature.every((byte, index) => byte === anyByte || firstBytes[index] === byte);
}

export function contentTypeOfKey(key: string): FileContentType | null {
  const name = key.split("/").at(-1) ?? "";
  const extension = name.includes(".") ? name.slice(name.lastIndexOf(".") + 1).toLowerCase() : "";
  return documentContentTypes.find((type) => fileTypes[type].extensions.includes(extension)) ?? null;
}

function headerSafe(fileName: string) {
  return fileName.replace(/[^ -~]|["\\]/g, "_");
}

function encodedForHeader(fileName: string) {
  return encodeURIComponent(fileName).replace(/['()*]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
}

export function servedFile(file: { fileName: string; contentType: string | null }) {
  const names = `filename="${headerSafe(file.fileName)}"; filename*=UTF-8''${encodedForHeader(file.fileName)}`;
  if (file.contentType !== null && isFileContentType(file.contentType)) {
    return { contentType: file.contentType, disposition: `inline; ${names}` };
  }
  return { contentType: "application/octet-stream", disposition: `attachment; ${names}` };
}

const allowed: Record<UploadPurpose, readonly string[]> = {
  driver_license: documentContentTypes,
  vehicle_registration: documentContentTypes,
  driver_photo: photoContentTypes,
};

export const uploadMessages = {
  tooBig: `Files must be ${String(maxDocumentBytes / (1024 * 1024))} MB or smaller.`,
  notADocument: "Upload a PDF or an image (JPEG, PNG or WebP).",
  notAPhoto: "Use a JPEG, PNG or WebP photo.",
  notWhatItSays: "That file is not the PDF or image it says it is. Upload the original file.",
};

const wrongType: Record<UploadPurpose, string> = {
  driver_license: uploadMessages.notADocument,
  vehicle_registration: uploadMessages.notADocument,
  driver_photo: uploadMessages.notAPhoto,
};

const fileOnly = z.object({
  purpose: z.enum(uploadPurposes),
  fileName: z.string().trim().min(1, "The file needs a name.").max(200, "Rename the file to 200 characters or fewer."),
  contentType: z.string(),
  sizeBytes: z.number().int().min(1, "That file is empty.").max(maxDocumentBytes, uploadMessages.tooBig),
});

const fileFields = fileOnly.extend({ ownerId: z.uuid() });

function typeCheck(file: z.output<typeof fileOnly>, context: z.RefinementCtx) {
  if (!allowed[file.purpose].includes(file.contentType)) {
    context.addIssue({ code: "custom", path: ["contentType"], message: wrongType[file.purpose] });
  }
}

export const uploadRequest = fileFields.superRefine(typeCheck);

export const savedUpload = fileFields.extend({ key: z.string().min(1) }).superRefine(typeCheck);

const fileCheck = fileOnly.superRefine(typeCheck);

export function uploadProblem(purpose: UploadPurpose, file: { type: string; size: number; name: string }): string | null {
  const result = fileCheck.safeParse({
    purpose,
    fileName: file.name,
    contentType: file.type,
    sizeBytes: file.size,
  });
  return result.success ? null : (result.error.issues[0]?.message ?? "That file cannot be uploaded.");
}

export function storageKey(upload: { purpose: UploadPurpose; ownerId: string; fileName: string; contentType: string }, uploadId: string): string {
  const baseName = upload.fileName.replace(/\.[^.]*$/, "");
  const safeName = baseName.replace(/[^\w.-]+/g, "-").replace(/^-+|-+$/g, "").slice(-120) || "file";
  const extension = isFileContentType(upload.contentType) ? `.${fileTypes[upload.contentType].extensions[0]}` : "";
  return `${upload.purpose}/${upload.ownerId}/${uploadId}/${safeName}${extension}`;
}

export function uploadIdOf(key: string | null): string | null {
  return key?.split("/")[2] ?? null;
}

export function keyBelongsTo(key: string, upload: { purpose: UploadPurpose; ownerId: string; contentType: string }): boolean {
  return (
    key.startsWith(`${upload.purpose}/${upload.ownerId}/`) &&
    !key.split("/").includes("..") &&
    contentTypeOfKey(key) === upload.contentType
  );
}

export const documentRow = z.object({
  id: z.uuid(),
  fileName: z.string(),
  contentType: z.string(),
  sizeBytes: z.number().int(),
  uploadedAt: z.iso.datetime({ offset: true }),
});

export type DocumentRow = z.infer<typeof documentRow>;
