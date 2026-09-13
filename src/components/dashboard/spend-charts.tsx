import { formatInrFromPaise } from "@/lib/money";
import { kiChartPalette } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

export type SpendSlice = {
  categoryId: string | null;
  categoryName: string;
  amount: number;
  shareBps: number;
};

export function SpendDonut({
  slices,
  totalPaise,
  className,
}: {
  slices: SpendSlice[];
  totalPaise: number;
  className?: string;
}) {
  const stops: string[] = [];
  let cursor = 0;

  for (let i = 0; i < slices.length; i++) {
    const slice = slices[i]!;
    const pct = slice.shareBps / 100;
    const color = kiChartPalette[i % kiChartPalette.length]!;
    const start = cursor;
    const end = cursor + pct;
    stops.push(`${color} ${start}% ${end}%`);
    cursor = end;
  }

  if (stops.length === 0) {
    stops.push("rgba(255,255,255,0.08) 0% 100%");
  } else if (cursor < 100) {
    stops.push(`rgba(255,255,255,0.06) ${cursor}% 100%`);
  }

  return (
    <div className={cn("flex flex-col items-center gap-5 sm:flex-row sm:items-center", className)}>
      <div
        className="relative size-40 shrink-0 rounded-full shadow-[0_0_40px_rgba(0,208,132,0.12)]"
        style={{
          background: `conic-gradient(from -90deg, ${stops.join(", ")})`,
        }}
        role="img"
        aria-label="Spend by category"
      >
        <div className="absolute inset-[18%] flex flex-col items-center justify-center rounded-full border border-white/10 bg-[color-mix(in_srgb,var(--ki-surface)_92%,black)] text-center">
          <p className="text-metric-sm text-white">
            {formatInrFromPaise(totalPaise)}
          </p>
          <p className="text-meta mt-1 text-[10px] text-muted-white">
            Total spent
          </p>
        </div>
      </div>

      <ul className="w-full min-w-0 space-y-2.5">
        {slices.length === 0 ? (
          <li className="text-sm text-muted-white">No shared spend yet.</li>
        ) : (
          slices.map((slice, index) => (
            <li
              key={slice.categoryId ?? slice.categoryName}
              className="flex items-center justify-between gap-3 text-sm"
            >
              <span className="flex min-w-0 items-center gap-2">
                <span
                  aria-hidden
                  className="size-2.5 shrink-0 rounded-full"
                  style={{
                    backgroundColor:
                      kiChartPalette[index % kiChartPalette.length],
                  }}
                />
                <span className="truncate text-white/90">
                  {slice.categoryName}
                </span>
              </span>
              <span className="shrink-0 font-tabular text-muted-white">
                {(slice.shareBps / 100).toFixed(0)}%
              </span>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

export function SpendBars({ slices }: { slices: SpendSlice[] }) {
  if (slices.length === 0) {
    return (
      <p className="text-sm text-muted-white">
        Your construction expenses will appear here once the first shared payment
        is recorded.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {slices.map((row, index) => (
        <div key={row.categoryId ?? row.categoryName} className="space-y-1.5">
          <div className="flex items-baseline justify-between gap-2 text-sm">
            <span className="font-medium text-white/90">{row.categoryName}</span>
            <span className="font-tabular text-muted-white">
              {formatInrFromPaise(row.amount)}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.08]">
            <div
              className="h-full rounded-full transition-[width] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
              style={{
                width: `${Math.max(row.shareBps / 100, 4)}%`,
                backgroundColor: kiChartPalette[index % kiChartPalette.length],
                boxShadow: `0 0 12px ${kiChartPalette[index % kiChartPalette.length]}33`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
