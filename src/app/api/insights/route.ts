import { getInsights } from "@/server/queries/insights";
import { pollingRoute } from "@/server/route";

export const GET = pollingRoute({ access: "signed-in", read: getInsights });
