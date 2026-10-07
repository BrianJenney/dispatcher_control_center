import { and, eq, ilike } from "drizzle-orm";
import { trips } from "@/db/schema";
import { exportLimit } from "@/domain/csv";
import type { JobsFilter, JobsSnapshot } from "@/domain/jobs";
import { tripRows } from "@/server/queries/trips";

function containing(text: string) {
  return `%${text.replace(/[\\%_]/g, (character) => `\\${character}`)}%`;
}

function matching(filter: Pick<JobsFilter, "q" | "status">) {
  return and(
    filter.status ? eq(trips.status, filter.status) : undefined,
    filter.q ? ilike(trips.customerName, containing(filter.q)) : undefined,
  );
}

export function getTripsForExport(filter: Pick<JobsFilter, "q" | "status">) {
  return tripRows(matching(filter), { limit: exportLimit, newestFirst: true });
}

export async function getJobs(filter: JobsFilter): Promise<JobsSnapshot> {
  const rows = await tripRows(matching(filter), { limit: filter.show + 1, newestFirst: true });
  return { trips: rows.slice(0, filter.show), hasMore: rows.length > filter.show };
}
