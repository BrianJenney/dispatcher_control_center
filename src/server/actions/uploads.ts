"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import type { Transaction } from "@/db/client";
import { documents, drivers, vehicles } from "@/db/schema";
import { DomainError, missingRecord } from "@/domain/result";
import {
  contentMatches,
  keyBelongsTo,
  savedUpload,
  signatureBytes,
  storageKey,
  uploadMessages,
  uploadRequest,
  type UploadPurpose,
} from "@/domain/uploads";
import { defineAction } from "@/server/action";
import { storage } from "@/server/storage";

async function ownerExists(tx: Transaction, purpose: UploadPurpose, ownerId: string) {
  const table = purpose === "vehicle_registration" ? vehicles : drivers;
  const [owner] = await tx.select({ id: table.id }).from(table).where(eq(table.id, ownerId));
  if (!owner) throw new DomainError(purpose === "vehicle_registration" ? missingRecord.vehicle : missingRecord.driver);
}

type StoredUpload = { key: string; contentType: string; sizeBytes: number };

async function storedFileProblem(upload: StoredUpload, stored: { contentType: string; sizeBytes: number }) {
  if (stored.sizeBytes !== upload.sizeBytes || stored.contentType !== upload.contentType) {
    return "The file changed while uploading. Try again.";
  }
  if (!contentMatches(upload.contentType, await storage.firstBytes(upload.key, signatureBytes))) return uploadMessages.notWhatItSays;
  return null;
}

async function checkStoredFile(upload: StoredUpload) {
  const stored = await storage.describe(upload.key);
  if (!stored) throw new DomainError("The upload did not finish. Try again.");
  const problem = await storedFileProblem(upload, stored);
  if (problem) {
    await storage.remove(upload.key);
    throw new DomainError(problem);
  }
}

export const prepareUpload = defineAction(uploadRequest, async (input, { tx }) => {
  await ownerExists(tx, input.purpose, input.ownerId);
  const key = storageKey(input.purpose, input.ownerId, crypto.randomUUID(), input.fileName);
  return { key, url: await storage.uploadUrl(key, input) };
});

export const saveUpload = defineAction(savedUpload, async (input, { tx, userId }) => {
  if (!keyBelongsTo(input.key, input.purpose, input.ownerId)) throw new DomainError("That upload does not belong here.");
  await ownerExists(tx, input.purpose, input.ownerId);
  await checkStoredFile(input);

  if (input.purpose === "driver_photo") {
    const [previous] = await tx.select({ photoKey: drivers.photoKey }).from(drivers).where(eq(drivers.id, input.ownerId));
    await tx.update(drivers).set({ photoKey: input.key }).where(eq(drivers.id, input.ownerId));
    if (previous?.photoKey) await storage.remove(previous.photoKey);
    return { id: input.ownerId };
  }

  const [saved] = await tx
    .insert(documents)
    .values({
      kind: input.purpose,
      driverId: input.purpose === "driver_license" ? input.ownerId : null,
      vehicleId: input.purpose === "vehicle_registration" ? input.ownerId : null,
      storageKey: input.key,
      fileName: input.fileName,
      contentType: input.contentType,
      sizeBytes: input.sizeBytes,
      uploadedBy: userId,
    })
    .returning({ id: documents.id });
  if (!saved) throw new Error("Saving the document returned nothing.");
  return saved;
});

export const deleteDocument = defineAction(z.object({ documentId: z.uuid() }), async (input, { tx }) => {
  const [removed] = await tx
    .delete(documents)
    .where(eq(documents.id, input.documentId))
    .returning({ storageKey: documents.storageKey, fileName: documents.fileName });
  if (!removed) throw new DomainError("That document was already deleted.");
  await storage.remove(removed.storageKey);
  return { fileName: removed.fileName };
});
