import { db } from "@/db/client";

export async function CheckCount() {
  const rows = await db.query.healthChecks.findMany();
  return <p>{rows.length}</p>;
}
