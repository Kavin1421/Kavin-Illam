import Link from "next/link";
import type { ReactNode } from "react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * MediCore-style light panel on the dark app shell for loan forms.
 */
export function LoanPaperShell({
  eyebrow,
  title,
  description,
  backHref,
  backLabel = "Back",
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  backHref: string;
  backLabel?: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-5 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-[11px] font-semibold tracking-[0.16em] text-teal-200/90 uppercase">
            {eyebrow}
          </p>
          <h2 className="font-heading text-2xl tracking-tight text-white sm:text-3xl">
            {title}
          </h2>
          {description ? (
            <p className="max-w-lg text-sm leading-relaxed text-teal-50/75">
              {description}
            </p>
          ) : null}
        </div>
        <Link
          href={backHref}
          className={cn(
            buttonVariants({ variant: "outline" }),
            "border-white/25 bg-white/10 text-white hover:bg-white/15 hover:text-white",
          )}
        >
          {backLabel}
        </Link>
      </div>

      <div className="overflow-hidden rounded-[28px] border border-white/15 bg-white text-slate-900 shadow-[0_24px_60px_rgba(2,44,34,0.28)]">
        <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-3 sm:px-7">
          <p className="text-xs font-medium text-slate-500">
            Fields stay on a light card so every label and value is easy to read.
          </p>
        </div>
        <div className="p-5 sm:p-7">{children}</div>
      </div>
    </div>
  );
}
