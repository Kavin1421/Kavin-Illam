import { formatInrFromPaise } from "@/lib/money";
import { cn } from "@/lib/utils";

export type MonthlyPoint = {
  label: string;
  spent: number;
  committed: number;
};

export function MonthlySpendChart({
  series,
  year,
  className,
}: {
  series: MonthlyPoint[];
  year: number;
  className?: string;
}) {
  const max = Math.max(
    1,
    ...series.flatMap((p) => [p.spent, p.committed]),
  );
  const chartH = 160;
  const chartW = 560;
  const padL = 8;
  const padR = 8;
  const padT = 12;
  const padB = 28;
  const innerW = chartW - padL - padR;
  const innerH = chartH - padT - padB;
  const groupW = innerW / 12;
  const barW = Math.max(4, groupW * 0.32);

  return (
    <div className={cn("w-full", className)}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-4 text-xs text-muted-white">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-cta" />
            Spent (shared)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-cyan/80" />
            Committed
          </span>
        </div>
        <span className="text-xs text-muted-white">{year}</span>
      </div>

      <svg
        viewBox={`0 0 ${chartW} ${chartH}`}
        className="h-44 w-full"
        role="img"
        aria-label={`Monthly spending for ${year}`}
      >
        {[0.25, 0.5, 0.75, 1].map((tick) => {
          const y = padT + innerH * (1 - tick);
          return (
            <line
              key={tick}
              x1={padL}
              x2={chartW - padR}
              y1={y}
              y2={y}
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="1"
            />
          );
        })}

        {series.map((point, i) => {
          const x0 = padL + i * groupW + groupW * 0.18;
          const spentH = (point.spent / max) * innerH;
          const commitH = (point.committed / max) * innerH;
          const spentY = padT + innerH - spentH;
          const commitY = padT + innerH - commitH;

          return (
            <g key={point.label}>
              <rect
                x={x0}
                y={spentY}
                width={barW}
                height={Math.max(spentH, point.spent > 0 ? 2 : 0)}
                rx="3"
                fill="#00D084"
                opacity="0.92"
              >
                <title>{`${point.label}: spent ${formatInrFromPaise(point.spent)}`}</title>
              </rect>
              <rect
                x={x0 + barW + 3}
                y={commitY}
                width={barW}
                height={Math.max(commitH, point.committed > 0 ? 2 : 0)}
                rx="3"
                fill="#22D3EE"
                opacity="0.75"
              >
                <title>{`${point.label}: committed ${formatInrFromPaise(point.committed)}`}</title>
              </rect>
              <text
                x={x0 + barW}
                y={chartH - 8}
                textAnchor="middle"
                fill="rgba(184,214,209,0.75)"
                fontSize="10"
              >
                {point.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/** Tiny decorative spark bars for metric cards (relative heights 0–100). */
export function MiniSparkBars({
  values,
  color = "#00D084",
  className,
}: {
  values: number[];
  color?: string;
  className?: string;
}) {
  const max = Math.max(1, ...values);
  return (
    <div className={cn("flex h-8 items-end gap-0.5", className)} aria-hidden>
      {values.map((v, i) => (
        <span
          key={i}
          className="w-1 rounded-sm opacity-80"
          style={{
            height: `${Math.max(12, Math.round((v / max) * 100))}%`,
            backgroundColor: color,
          }}
        />
      ))}
    </div>
  );
}
