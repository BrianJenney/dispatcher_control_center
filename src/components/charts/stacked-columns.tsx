import { useId } from "react";

export type ColumnSegment = { label: string; value: number; className: string };
export type Column = { label: string; caption: string; segments: readonly ColumnSegment[] };

const barHeight = 160;

export function StackedColumns({ title, columns, format }: { title: string; columns: readonly Column[]; format: (value: number) => string }) {
  const headingId = useId();
  const totals = columns.map((column) => column.segments.reduce((sum, segment) => sum + segment.value, 0));
  const peak = Math.max(1, ...totals);
  const legend = columns[0]?.segments ?? [];
  return (
    <figure aria-labelledby={headingId} className="space-y-3">
      <figcaption id={headingId} className="text-sm font-semibold">
        {title}
      </figcaption>
      {legend.length > 1 ? (
        <ul aria-hidden className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {legend.map((segment) => (
            <li key={segment.label} className="flex items-center gap-1.5">
              <span className={`size-2.5 rounded-sm ${segment.className}`} />
              {segment.label}
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex items-end gap-2 sm:gap-3" style={{ height: barHeight + 40 }}>
        {columns.map((column, index) => {
          const total = totals[index] ?? 0;
          return (
            <div key={column.label} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
              <span className="text-xs font-medium tabular-nums">{total === 0 ? "" : format(total)}</span>
              <div
                title={`${column.caption}: ${column.segments.map((segment) => `${segment.label} ${format(segment.value)}`).join(", ")}`}
                className="flex w-full max-w-6 flex-col-reverse gap-0.5"
                style={{ height: Math.round((total / peak) * barHeight) }}
              >
                {column.segments.map((segment) =>
                  segment.value === 0 ? null : (
                    <span
                      key={segment.label}
                      className={`block min-h-0.5 last:rounded-t-sm ${segment.className}`}
                      style={{ flexGrow: segment.value, flexBasis: 0 }}
                    />
                  ),
                )}
              </div>
              <span className="text-xs text-muted-foreground">{column.label}</span>
            </div>
          );
        })}
      </div>
      <table className="sr-only">
        <caption>{title}</caption>
        <thead>
          <tr>
            <th scope="col">Day</th>
            {legend.map((segment) => (
              <th key={segment.label} scope="col">
                {segment.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {columns.map((column) => (
            <tr key={column.label}>
              <th scope="row">{column.caption}</th>
              {column.segments.map((segment) => (
                <td key={segment.label}>{format(segment.value)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
