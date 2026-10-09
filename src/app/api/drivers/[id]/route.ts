import { getDriverProfile } from "@/server/queries/people";
import { pollingRoute } from "@/server/route";

export const GET = pollingRoute({ access: "signed-in", read: ({ params }) => getDriverProfile(params.id) });
