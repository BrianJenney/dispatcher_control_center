import { z } from "zod";
import { getDocumentFile } from "@/server/queries/people";
import { fileRoute } from "@/server/route";

export const GET = fileRoute({
  read: async (params) => {
    const id = z.uuid().safeParse(params.id);
    return id.success ? getDocumentFile(id.data) : null;
  },
});
