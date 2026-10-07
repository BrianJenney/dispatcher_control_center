import { jobsFilter } from "@/domain/jobs";
import { getJobs } from "@/server/queries/jobs";
import { pollingRoute } from "@/server/route";

export const GET = pollingRoute({
  access: "signed-in",
  read: ({ searchParams }) => getJobs(jobsFilter.parse(Object.fromEntries(searchParams))),
});
