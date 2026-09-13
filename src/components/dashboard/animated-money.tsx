"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

import { formatInrFromPaise } from "@/lib/money";
import { cn } from "@/lib/utils";

function subscribeReducedMotion(onChange: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function getReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function usePrefersReducedMotion() {
  return useSyncExternalStore(subscribeReducedMotion, getReducedMotion, () => true);
}

/** Animate integer paise → formatted INR. Source of truth stays integer. */
export function AnimatedMoney({
  paise,
  className,
}: {
  paise: number;
  className?: string;
}) {
  const reduced = usePrefersReducedMotion();
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!Number.isInteger(paise) || reduced) return;

    const start = performance.now();
    const duration = 850;
    let frame = 0;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(paise * eased));
      if (t < 1) frame = window.requestAnimationFrame(tick);
    };

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [paise, reduced]);

  const shown = reduced ? paise : value;

  return (
    <span className={cn("font-tabular", className)}>
      {Number.isInteger(shown) ? formatInrFromPaise(shown) : "—"}
    </span>
  );
}

export function AnimatedPercent({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  const reduced = usePrefersReducedMotion();
  const safe = Math.max(0, Math.min(100, Math.round(value)));
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (reduced) return;
    const start = performance.now();
    const duration = 800;
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(Math.round(safe * eased));
      if (t < 1) frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [safe, reduced]);

  return (
    <span className={cn("font-tabular", className)}>
      {reduced ? safe : shown}%
    </span>
  );
}
