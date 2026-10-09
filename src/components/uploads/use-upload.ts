"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { unreachableMessage } from "@/components/form";
import { driversQueryKey, fleetQueryKey } from "@/components/queries";
import { failure, type ActionResult } from "@/domain/result";
import { uploadProblem, type UploadPurpose } from "@/domain/uploads";
import { prepareUpload, saveUpload } from "@/server/actions/uploads";

async function upload(purpose: UploadPurpose, ownerId: string, file: File): Promise<ActionResult<unknown>> {
  const problem = uploadProblem(purpose, file);
  if (problem) return failure(problem);
  const request = { purpose, ownerId, fileName: file.name, contentType: file.type, sizeBytes: file.size };
  const prepared = await prepareUpload(request);
  if (!prepared.ok) return prepared;
  const stored = await fetch(prepared.data.url, { method: "PUT", body: file, headers: { "content-type": file.type } });
  if (!stored.ok) return failure("The upload did not finish. Try again.");
  return saveUpload({ ...request, key: prepared.data.key });
}

export function ownerQueryKey(purpose: UploadPurpose) {
  return purpose === "vehicle_registration" ? fleetQueryKey : driversQueryKey;
}

export function useUpload(purpose: UploadPurpose, ownerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => upload(purpose, ownerId, file),
    onSuccess: async (result, file) => {
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ownerQueryKey(purpose) });
      toast.success(`${file.name} is uploaded.`);
    },
    onError: () => {
      toast.error(unreachableMessage);
    },
  });
}
