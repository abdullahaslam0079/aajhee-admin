"use client";

import type { TimeseriesPoint } from "@/lib/types";

export function BarChart({
  series,
  scansLabel,
  redemptionsLabel,
}: {
  series: TimeseriesPoint[];
  scansLabel: string;
  redemptionsLabel: string;
}) {
  const max = Math.max(1, ...series.flatMap((p) => [p.scans || 0, p.redemptions || 0]));
  return (
    <div>
      <div className="mb-4 flex gap-4 text-xs font-semibold">
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-sm bg-deal-deep" /> {scansLabel}
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-sm bg-amber-400" /> {redemptionsLabel}
        </span>
      </div>
      <div className="flex h-56 items-end gap-1.5 overflow-x-auto pb-8">
        {series.map((point) => (
          <div key={point.date} className="flex min-w-8 flex-1 flex-col items-center gap-1">
            <div className="flex h-48 w-full items-end justify-center gap-0.5">
              <div
                className="w-2.5 rounded-t bg-deal-deep"
                style={{ height: `${((point.scans || 0) / max) * 100}%` }}
                title={`${scansLabel}: ${point.scans}`}
              />
              <div
                className="w-2.5 rounded-t bg-amber-400"
                style={{ height: `${((point.redemptions || 0) / max) * 100}%` }}
                title={`${redemptionsLabel}: ${point.redemptions}`}
              />
            </div>
            <span className="rotate-[-50deg] text-[10px] text-muted">
              {point.date.slice(5)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
