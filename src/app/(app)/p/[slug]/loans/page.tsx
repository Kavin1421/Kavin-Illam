import type { Metadata } from "next";
import Link from "next/link";

import {
  loanTypeBadgeClass,
  loanTypeShortLabel,
} from "@/components/loans/loan-labels";
import { buttonVariants } from "@/components/ui/button";
import { formatDate } from "@/lib/dates";
import { formatInrFromPaise, rupeeInputFromPaise } from "@/lib/money";
import { cn } from "@/lib/utils";
import { roleHasPermission } from "@/server/authorization";
import {
  interestRatePercentLabel,
  tenureLabel,
} from "@/server/loans/math";
import { getLoanOverview } from "@/server/loans/service";

export const metadata: Metadata = {
  title: "Home loan",
};

export default async function LoansPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ filter?: string }>;
}) {
  const { slug } = await params;
  const { filter = "all" } = await searchParams;
  const { role, facility, balances, transactions, openDiversions } =
    await getLoanOverview(slug);
  const canCreate = roleHasPermission(role, "LOAN_CREATE");
  const canEdit = roleHasPermission(role, "LOAN_EDIT");

  if (!facility || !balances) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8 sm:px-6">
        <div className="rounded-[28px] border border-white/10 bg-white p-6 shadow-[0_20px_50px_rgba(2,44,34,0.18)] sm:p-8">
          <p className="text-[11px] tracking-[0.18em] text-emerald-700 uppercase">
            Home loan
          </p>
          <h2 className="mt-2 font-heading text-3xl tracking-tight text-[#063f3a]">
            Set up your Home Loan wallet
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600">
            Track sanctioned principal, bank disbursements, construction
            spends, and rotational diversions — completely separate from the
            construction Finance ledger.
          </p>
          {canCreate ? (
            <Link
              href={`/p/${slug}/loans/setup`}
              className={cn(
                buttonVariants(),
                "mt-6 h-11 bg-emerald-700 px-5 text-white hover:bg-emerald-800",
              )}
            >
              Create Home Loan
            </Link>
          ) : (
            <p className="mt-6 text-sm text-slate-500">
              Ask an owner or accountant to set up the facility.
            </p>
          )}
        </div>
      </div>
    );
  }

  const filtered = transactions.filter((row) => {
    if (filter === "construction") return row.type === "DEBIT_CONSTRUCTION";
    if (filter === "open") {
      return row.type === "DEBIT_OTHER" && row.rotationalStatus !== "REPAID";
    }
    if (filter === "repaid") {
      return (
        row.type === "DEBIT_OTHER" && row.rotationalStatus === "REPAID"
      );
    }
    return true;
  });

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <p className="text-[11px] tracking-[0.16em] text-teal-200/80 uppercase">
            Money manager
          </p>
          <h2 className="font-heading text-3xl tracking-tight text-white">
            Home loan
          </h2>
          <p className="text-sm text-teal-100/70">
            {facility.lenderName || "Home Loan"} · ROI{" "}
            {interestRatePercentLabel(facility.interestRateBps)} ·{" "}
            {tenureLabel(facility.tenureMonths)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canEdit ? (
            <Link
              href={`/p/${slug}/loans/setup`}
              className={cn(
                buttonVariants({ variant: "outline" }),
                "border-white/20 bg-white/5 text-white hover:bg-white/10",
              )}
            >
              Edit facility
            </Link>
          ) : null}
          {canCreate ? (
            <Link href={`/p/${slug}/loans/new`} className={cn(buttonVariants())}>
              Record transaction
            </Link>
          ) : null}
        </div>
      </div>

      {balances.openRotational > 0 ? (
        <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-50">
          <strong className="font-semibold">
            {formatInrFromPaise(balances.openRotational)}
          </strong>{" "}
          still open on rotational diversions
          {openDiversions.length === 1 ? " (1 payment)" : ` (${openDiversions.length} payments)`}
          . Credit these back into the loan account when you repay them.
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile
          label="Sanctioned"
          value={formatInrFromPaise(balances.sanctioned)}
          hint="Bank sanction limit"
          tone="sky"
        />
        <MetricTile
          label="Disbursed"
          value={formatInrFromPaise(balances.disbursed)}
          hint={`${Math.round((balances.disbursed / Math.max(balances.sanctioned, 1)) * 1000) / 10}% of sanction`}
          tone="teal"
        />
        <MetricTile
          label="Available"
          value={formatInrFromPaise(balances.available)}
          hint="Ready to spend from loan"
          tone="emerald"
        />
        <MetricTile
          label="Open rotational"
          value={formatInrFromPaise(balances.openRotational)}
          hint={`${formatInrFromPaise(balances.diverted)} diverted · ${formatInrFromPaise(balances.repaidRotational)} repaid`}
          tone="amber"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-teal-50/90">
          Construction spent{" "}
          <span className="font-semibold text-white">
            {formatInrFromPaise(balances.spentConstruction)}
          </span>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-teal-50/90">
          Facility reference{" "}
          <span className="font-semibold text-white">
            ₹{rupeeInputFromPaise(facility.sanctionedAmount)} sanctioned
          </span>
        </div>
      </div>

      <section className="overflow-hidden rounded-[28px] border border-white/10 bg-white shadow-[0_20px_50px_rgba(2,44,34,0.16)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-5">
          <div>
            <h3 className="text-lg font-semibold text-[#063f3a]">
              Loan ledger
            </h3>
            <p className="text-sm text-slate-500">
              Principal movements only — independent of construction Finance.
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {[
              ["all", "All"],
              ["construction", "Construction"],
              ["open", "Rotational open"],
              ["repaid", "Repaid"],
            ].map(([key, label]) => (
              <Link
                key={key}
                href={
                  key === "all"
                    ? `/p/${slug}/loans`
                    : `/p/${slug}/loans?filter=${key}`
                }
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition",
                  filter === key
                    ? "bg-[#063f3a] text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                )}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-slate-500">
            No transactions in this filter yet.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {filtered.map((row) => {
              const progress =
                row.type === "DEBIT_OTHER" && row.amount > 0
                  ? Math.min(
                      100,
                      Math.round((row.repaid / row.amount) * 100),
                    )
                  : null;
              return (
                <li key={row.id}>
                  <Link
                    href={`/p/${slug}/loans/${row.id}`}
                    className="flex flex-col gap-3 px-4 py-4 transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between sm:px-5"
                  >
                    <div className="min-w-0 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase",
                            loanTypeBadgeClass(row.type),
                          )}
                        >
                          {loanTypeShortLabel(row.type)}
                        </span>
                        {row.rotationalStatus ? (
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase",
                              row.rotationalStatus === "REPAID"
                                ? "bg-emerald-100 text-emerald-800"
                                : row.rotationalStatus === "PARTIALLY_REPAID"
                                  ? "bg-amber-100 text-amber-900"
                                  : "bg-orange-100 text-orange-900",
                            )}
                          >
                            {row.rotationalStatus.replaceAll("_", " ")}
                          </span>
                        ) : null}
                        <span className="font-mono text-xs text-slate-400">
                          {row.loanNumber}
                        </span>
                      </div>
                      <p className="truncate text-sm font-medium text-slate-900">
                        {row.description ||
                          row.paidTo ||
                          loanTypeShortLabel(row.type)}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatDate(row.transactionDate)}
                        {row.linkedDebit
                          ? ` · linked ${row.linkedDebit.loanNumber}`
                          : ""}
                      </p>
                      {progress != null ? (
                        <div className="max-w-xs">
                          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-amber-500"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <p className="mt-1 text-[11px] text-slate-500">
                            {formatInrFromPaise(row.repaid)} repaid ·{" "}
                            {formatInrFromPaise(row.outstanding)} open
                          </p>
                        </div>
                      ) : null}
                    </div>
                    <p
                      className={cn(
                        "shrink-0 text-lg font-semibold tracking-tight",
                        row.type === "DISBURSEMENT" ||
                          row.type === "CREDIT_REPAYMENT"
                          ? "text-emerald-700"
                          : "text-slate-900",
                      )}
                    >
                      {row.type === "DISBURSEMENT" ||
                      row.type === "CREDIT_REPAYMENT"
                        ? "+"
                        : "−"}
                      {formatInrFromPaise(row.amount)}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function MetricTile({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  tone: "sky" | "teal" | "emerald" | "amber";
}) {
  const tones = {
    sky: "bg-[#eef7ff] text-sky-950",
    teal: "bg-[#e8f7f2] text-teal-950",
    emerald: "bg-[#ecfdf5] text-emerald-950",
    amber: "bg-[#fff7e8] text-amber-950",
  } as const;

  return (
    <div
      className={cn(
        "rounded-[22px] border border-white/40 p-4 shadow-sm sm:p-5",
        tones[tone],
      )}
    >
      <p className="text-[11px] tracking-[0.14em] uppercase opacity-70">
        {label}
      </p>
      <p className="mt-2 text-[clamp(1.15rem,2.4vw,1.65rem)] leading-none font-bold tracking-tight">
        {value}
      </p>
      <p className="mt-2 text-xs leading-snug opacity-70">{hint}</p>
    </div>
  );
}
