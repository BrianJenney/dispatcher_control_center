import { getDriverPhoto } from "@/server/queries/people";
import { fileRoute } from "@/server/route";

export const GET = fileRoute({
  read: (params) => getDriverPhoto(params.id),
  browserCacheSeconds: 60 * 60,
});
