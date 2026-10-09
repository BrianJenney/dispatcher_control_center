import { getVehicleProfile } from "@/server/queries/people";
import { pollingRoute } from "@/server/route";

export const GET = pollingRoute({ access: "signed-in", read: ({ params }) => getVehicleProfile(params.id) });
