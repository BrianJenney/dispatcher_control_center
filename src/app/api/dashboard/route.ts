import { getDashboard } from "@/server/queries/dashboard";
import { pollingRoute } from "@/server/route";

export const GET = pollingRoute({ access: "signed-in", read: getDashboard });
