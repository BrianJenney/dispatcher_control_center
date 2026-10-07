import { and, eq, ilike } from "drizzle-orm";
import { trips } from "@/db/schema";
import type { JobsFilter, JobsSnapshot } from "@/domain/jobs";
import { tripRows } from "@/server/queries/trips";

function containing(text: string) {
  return `%${text.replace(/[\\%_]/g, (character) => `\\${character}`)}%`;
}

export async function getJobs(filter: JobsFilter): Promise<JobsSnapshot> {
  const rows = await tripRows(
    and(
      filter.status ? eq(trips.status, filter.status) : undefined,
      filter.q ? ilike(trips.customerName, containing(filter.q)) : undefined,
    ),
    { limit: filter.show + 1, newestFirst: true },
  );
  return { trips: rows.slice(0, filter.show), hasMore: rows.length > filter.show };
}
