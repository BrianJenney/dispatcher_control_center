import { tripsToCsv } from "@/domain/csv";
import { jobsFilter } from "@/domain/jobs";
import { wallTimeOf } from "@/domain/time";
import { env } from "@/env";
import { getTripsForExport } from "@/server/queries/jobs";
import { downloadRoute } from "@/server/route";

export const GET = downloadRoute({
  read: async (searchParams) => {
    const filter = jobsFilter.parse(Object.fromEntries(searchParams));
    const trips = await getTripsForExport(filter);
    return {
      fileName: `trips-${wallTimeOf(new Date(), env.APP_TIMEZONE).date}.csv`,
      contentType: "text/csv; charset=utf-8",
      body: tripsToCsv(trips, env.APP_TIMEZONE),
    };
  },
});
