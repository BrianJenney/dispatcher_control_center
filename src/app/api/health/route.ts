import { getHealthSnapshot } from "@/server/queries/health";
import { pollingRoute } from "@/server/route";

export const GET = pollingRoute({ access: "public", read: getHealthSnapshot });
