import { useId } from "react";

export type BarRow = { key: string; label: string; value: number };

export function BarList({
  title,
  rows,
  unit,
  barClassName,
  empty,
}: {
  title: string;
  rows: readonly BarRow[];
  unit: (value: number) => string;
  barClassName: string;
  empty: string;
}) {
  const headingId = useId();
  const peak = Math.max(1, ...rows.map((row) => row.value));
  return (
    <figure aria-labelledby={headingId} className="space-y-3">
      <figcaption id={headingId} className="text-sm font-semibold">
        {title}
      </figcaption>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="space-y-2.5">
          {rows.map((row) => (
            <li key={row.key} className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)_auto] items-center gap-3 text-sm">
              <span className="truncate" title={row.label}>
                {row.label}
              </span>
              <span aria-hidden className="h-2 rounded-full bg-muted">
                <span className={`block h-2 rounded-full ${barClassName}`} style={{ width: `${String((row.value / peak) * 100)}%` }} />
              </span>
              <span className="w-14 text-right text-xs font-medium tabular-nums">{unit(row.value)}</span>
            </li>
          ))}
        </ul>
      )}
    </figure>
  );
}
