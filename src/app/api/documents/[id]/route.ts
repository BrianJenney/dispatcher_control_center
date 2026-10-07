import { getDocumentFile } from "@/server/queries/people";
import { fileRoute } from "@/server/route";

export const GET = fileRoute({
  read: (params) => getDocumentFile(params.id),
});
