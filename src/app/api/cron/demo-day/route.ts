import { rollDemoDay } from "@/server/jobs/demo-day";
import { cronRoute } from "@/server/route";

export const GET = cronRoute(rollDemoDay);
