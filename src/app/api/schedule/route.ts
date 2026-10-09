import { getSchedule } from "@/server/queries/schedule";
import { pollingRoute } from "@/server/route";

export const GET = pollingRoute({ read: getSchedule });
