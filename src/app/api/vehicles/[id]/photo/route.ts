import { getVehiclePhoto } from "@/server/queries/people";
import { fileRoute } from "@/server/route";

export const GET = fileRoute({
  read: (params) => getVehiclePhoto(params.id),
  browserCacheSeconds: 60 * 60,
});
