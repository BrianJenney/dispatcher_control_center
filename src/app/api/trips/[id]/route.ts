import { getTripDetail } from "@/server/queries/trip-detail";
import { pollingRoute } from "@/server/route";

export const GET = pollingRoute({ read: ({ params }) => getTripDetail(params.id) });
