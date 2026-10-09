import { connection } from "next/server";
import { getDashboard } from "@/server/queries/dashboard";

export async function DashboardCount() {
  await connection();
  const dashboard = await getDashboard();
  return <p>{dashboard.trips.length}</p>;
}
