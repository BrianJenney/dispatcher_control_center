import { getHealthSnapshot } from "@/server/queries/health";
import { pollingRoute } from "@/server/route";

export const GET = pollingRoute({ access: "signed-in", read: getHealthSnapshot });
