import { activityFilter } from "@/domain/activity";
import { getActivity } from "@/server/queries/activity";
import { pollingRoute } from "@/server/route";

export const GET = pollingRoute({
  read: ({ searchParams }) => getActivity(activityFilter.parse(Object.fromEntries(searchParams))),
});
