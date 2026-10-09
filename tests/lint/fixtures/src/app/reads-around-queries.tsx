import { tripRows } from "@/server/trip-rows";

export async function TripCount() {
  const rows = await tripRows(undefined);
  return <p>{rows.length}</p>;
}
