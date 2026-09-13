"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

import { cn } from "@/lib/utils";

function subscribeReducedMotion(onChange: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => true,
  );
}

export function ProgressBar({
  value,
  className,
  trackClassName,
  fillClassName,
  glow,
}: {
  /** 0–100 */
  value: number;
  className?: string;
  trackClassName?: string;
  fillClassName?: string;
  glow?: boolean;
}) {
  const safe = Math.max(0, Math.min(100, value));
  const reduced = usePrefersReducedMotion();
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (reduced) return;
    const id = window.requestAnimationFrame(() => setWidth(safe));
    return () => window.cancelAnimationFrame(id);
  }, [safe, reduced]);

  const shown = reduced ? safe : width;

  return (
    <div
      className={cn(
        "h-2.5 w-full overflow-hidden rounded-full bg-white/[0.08]",
        trackClassName,
        className,
      )}
      role="progressbar"
      aria-valuenow={Math.round(safe)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn(
          "h-full rounded-full bg-[linear-gradient(90deg,#00C875,#22D3EE)]",
          !reduced &&
            "transition-[width] duration-[800ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
          glow && "shadow-[0_0_16px_rgba(0,208,132,0.28)]",
          fillClassName,
        )}
        style={{ width: `${shown}%` }}
      />
    </div>
  );
}
