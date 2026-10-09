import { getDrivers } from "@/server/queries/people";
import { pollingRoute } from "@/server/route";

export const GET = pollingRoute({ read: getDrivers });
