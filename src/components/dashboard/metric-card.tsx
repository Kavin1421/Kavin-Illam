import type { ReactNode } from "react";

import { AnimatedMoney } from "@/components/dashboard/animated-money";
import { MiniSparkBars } from "@/components/dashboard/monthly-chart";
import { cn } from "@/lib/utils";

const accentMap = {
  cyan: {
    bar: "bg-cyan",
    glow: "hover:shadow-[0_0_28px_rgba(34,211,238,0.14)]",
    icon: "bg-[image:var(--ki-gradient-cyan)] text-white",
    spark: "#22D3EE",
  },
  green: {
    bar: "bg-emerald-bright",
    glow: "hover:shadow-[0_0_28px_rgba(0,200,117,0.14)]",
    icon: "bg-[image:var(--ki-gradient-primary)] text-[var(--ki-bg-deep)]",
    spark: "#00C875",
  },
  purple: {
    bar: "bg-purple",
    glow: "hover:shadow-[0_0_28px_rgba(139,92,246,0.14)]",
    icon: "bg-[image:var(--ki-gradient-purple)] text-white",
    spark: "#8B5CF6",
  },
  amber: {
    bar: "bg-[var(--ki-amber)]",
    glow: "hover:shadow-[0_0_28px_rgba(245,158,11,0.14)]",
    icon: "bg-[image:var(--ki-gradient-amber)] text-[var(--ki-bg-deep)]",
    spark: "#F59E0B",
  },
  mint: {
    bar: "bg-mint",
    glow: "hover:shadow-[0_0_28px_rgba(94,234,212,0.12)]",
    icon: "bg-mint/20 text-mint",
    spark: "#5EEAD4",
  },
} as const;

export function MetricCard({
  label,
  paise,
  hint,
  accent = "green",
  icon,
  spark,
}: {
  label: string;
  paise: number;
  hint?: string;
  accent?: keyof typeof accentMap;
  icon?: ReactNode;
  spark?: number[];
}) {
  const styles = accentMap[accent];

  return (
    <div
      className={cn(
        "surface-card group/card relative overflow-hidden rounded-[1.125rem] p-5 transition-ki hover:-translate-y-0.5 hover:border-white/15",
        styles.glow,
      )}
    >
      <div
        aria-hidden
        className={cn(
          "absolute top-0 left-0 h-full w-[3px] rounded-l-[1.125rem]",
          styles.bar,
        )}
      />
      <div className="flex items-start justify-between gap-3">
        <p className="text-meta text-[var(--ki-muted)]">{label}</p>
        {icon ? (
          <span
            className={cn(
              "flex size-11 items-center justify-center rounded-[0.75rem] shadow-ki-sm",
              styles.icon,
            )}
          >
            {icon}
          </span>
        ) : null}
      </div>
      <div className="mt-3 flex items-end justify-between gap-3">
        <p className="text-metric-lg min-w-0">
          <AnimatedMoney paise={paise} />
        </p>
        {spark && spark.length > 0 ? (
          <MiniSparkBars
            values={spark}
            color={styles.spark}
            className="shrink-0 opacity-90"
          />
        ) : null}
      </div>
      {hint ? (
        <p className="mt-2 text-xs text-[var(--ki-muted)]">{hint}</p>
      ) : null}
    </div>
  );
}
