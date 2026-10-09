import { databaseReachable } from "@/server/queries/health";
import { uptimeRoute } from "@/server/route";

export const GET = uptimeRoute(databaseReachable);
