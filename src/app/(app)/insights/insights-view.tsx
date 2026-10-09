"use client";

import { AlertTriangle, Ban, CircleDollarSign, Clock, ListChecks, Percent } from "lucide-react";
import { BarList } from "@/components/charts/bar-list";
import { StackedColumns } from "@/components/charts/stacked-columns";
import { useFormat } from "@/components/format";
import { KpiTile } from "@/components/kpi-tile";
import { RecordLink } from "@/components/record-link";
import { useLiveQuery } from "@/components/live-query";
import { liveQueries } from "@/components/queries";
import { LiveUpdatesPaused } from "@/components/states";
import type { AttentionKind, InsightsSnapshot } from "@/domain/insights";

const attentionCopy: Record<AttentionKind, { label: string; hint: string }> = {
  "needs-driver-soon": { label: "Needs a driver soon", hint: "No driver and pickup within 2 hours" },
  "missed-pickup": { label: "Pickup time passed", hint: "Still an offer with no driver" },
  "late-to-start": { label: "Late to start", hint: "Assigned but not started 15 minutes after pickup" },
};

function percent(part: number, whole: number): string {
  return whole === 0 ? "0%" : `${String(Math.round((part / whole) * 100))}%`;
}

export function InsightsView({ initialData }: { initialData: InsightsSnapshot }) {
  const format = useFormat();
  const { data, isError, refetch } = useLiveQuery(liveQueries.insights, initialData);
  const days = data.days.map((day) => ({ ...day, label: format.weekday(day.start), caption: format.shortDay(day.start) }));
  const average = data.driverLoad.length === 0 ? 0 : data.driverLoad.reduce((sum, driver) => sum + driver.trips, 0) / data.driverLoad.length;
  const busiest = data.driverLoad[0];

  return (
    <div className="space-y-8">
      {isError ? <LiveUpdatesPaused what="the insights" onRetry={() => void refetch()} /> : null}
      <section aria-label="Last seven days" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <KpiTile label="Trips this week" value={String(data.weekTrips)} detail="last 7 days" icon={ListChecks} />
        <KpiTile
          label="Completion rate"
          value={percent(data.weekCompleted, data.weekTrips)}
          detail={`${String(data.weekCompleted)} completed`}
          icon={Percent}
        />
        <KpiTile
          label="Cancellation rate"
          value={percent(data.weekCancelled, data.weekTrips)}
          detail={`${String(data.weekCancelled)} cancelled`}
          icon={Ban}
        />
        <KpiTile label="Revenue this week" value={format.money(data.weekRevenueCents)} detail="completed trips only" icon={CircleDollarSign} />
      </section>

      <section aria-labelledby="attention-heading" className="space-y-3">
        <h2 id="attention-heading" className="text-lg font-semibold">
          Needs attention
        </h2>
        {data.attention.length === 0 ? (
          <p className="rounded-xl border border-dashed px-4 py-6 text-sm text-muted-foreground">
            Nothing needs attention. Every trip due in the next 2 hours has a driver, and nothing is late to start.
          </p>
        ) : (
          <ul className="divide-y rounded-xl border bg-card">
            {data.attention.map((item) => (
              <li key={`${item.kind}-${item.tripId}`} className="flex items-center gap-3 p-3 sm:p-4">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-status-offer/10 text-status-offer">
                  {item.kind === "late-to-start" ? <Clock className="size-4" aria-hidden /> : <AlertTriangle className="size-4" aria-hidden />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{attentionCopy[item.kind].label}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    #{item.reference} {item.customerName} at {format.time(item.pickupAt)} · {attentionCopy[item.kind].hint}
                  </span>
                </span>
                <RecordLink
                  href={`/jobs/${item.tripId}`}
                  aria-label={`Open trip ${String(item.reference)}`}
                  className="text-sm font-medium underline-offset-4 hover:underline"
                >
                  Open
                </RecordLink>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <section className="rounded-2xl border bg-card p-4 sm:p-5">
          <StackedColumns
            title="Trips per day"
            format={String}
            columns={days.map((day) => ({
              label: day.label,
              caption: day.caption,
              segments: [
                { label: "Completed", value: day.completed, className: "bg-status-completed" },
                { label: "Still open", value: day.open, className: "bg-status-assigned" },
                { label: "Cancelled", value: day.cancelled, className: "bg-status-cancelled" },
              ],
            }))}
          />
        </section>
        <section className="rounded-2xl border bg-card p-4 sm:p-5">
          <StackedColumns
            title="Revenue per day"
            format={(value) => format.money(value)}
            formatTotal={(value) => format.compactMoney(value)}
            columns={days.map((day) => ({
              label: day.label,
              caption: day.caption,
              segments: [{ label: "Revenue", value: day.revenueCents, className: "bg-primary" }],
            }))}
          />
        </section>
        <section className="rounded-2xl border bg-card p-4 sm:p-5">
          <BarList
            title="Why trips were cancelled"
            rows={data.cancelReasons.map((entry) => ({ key: entry.reason, label: entry.reason, value: entry.count }))}
            unit={(value) => `${String(value)} ${value === 1 ? "trip" : "trips"}`}
            barClassName="bg-status-cancelled"
            empty="No cancellations in the last 7 days."
          />
        </section>
        <section className="rounded-2xl border bg-card p-4 sm:p-5">
          <BarList
            title="Trips per driver today"
            rows={data.driverLoad.map((driver) => ({ key: driver.driverId, label: driver.name, value: driver.trips }))}
            unit={(value) => `${String(value)} ${value === 1 ? "trip" : "trips"}`}
            barClassName="bg-primary"
            empty="No drivers are on duty."
          />
          {busiest ? (
            <p className="mt-3 text-xs text-muted-foreground">
              Average {average.toFixed(1)} trips per on duty driver. Most: {busiest.name} with {busiest.trips}.
            </p>
          ) : null}
        </section>
      </div>
    </div>
  );
}
