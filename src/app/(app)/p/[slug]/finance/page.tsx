import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowUpRight,
  HandCoins,
  Plus,
  Search,
  Wallet,
} from "lucide-react";

import { MetricCard } from "@/components/dashboard/metric-card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { formatDate } from "@/lib/dates";
import { formatInrFromPaise } from "@/lib/money";
import { cn } from "@/lib/utils";
import { roleHasPermission } from "@/server/authorization";
import { listTransactions } from "@/server/finance/transactions";

export const metadata: Metadata = {
  title: "Finance",
};

function statusTone(status: string) {
  switch (status) {
    case "PAID":
    case "APPROVED":
      return "border-cta/30 bg-cta/15 text-mint";
    case "PENDING":
    case "PARTIALLY_PAID":
      return "border-warning/30 bg-warning/15 text-warning";
    case "REJECTED":
    case "CANCELLED":
      return "border-destructive/30 bg-destructive/15 text-destructive";
    default:
      return "border-white/15 bg-white/[0.06] text-muted-white";
  }
}

function amountTone(type: string, direction: string) {
  if (type === "INCOME" || direction === "IN") return "text-mint";
  if (type === "REFUND") return "text-cyan";
  return "text-white";
}

export default async function FinancePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { role, transactions, totals, sharedTotals } =
    await listTransactions(slug);
  const canCreate = roleHasPermission(role, "FINANCE_CREATE");
  const pendingCount = transactions.filter((tx) => tx.status === "PENDING").length;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <p className="text-meta text-mint/80">Ledger</p>
          <h2 className="text-page-title">Finance</h2>
          <p className="text-lede max-w-2xl">
            Every rupee tracked. Every payment accounted for. Shared totals
            exclude private expenses.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/p/${slug}/finance/accounts`}
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            Accounts
          </Link>
          <Link
            href={`/p/${slug}/advances`}
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            Advances
          </Link>
          {canCreate ? (
            <Link
              href={`/p/${slug}/finance/new`}
              className={cn(buttonVariants())}
            >
              <Plus className="size-4" />
              Add transaction
            </Link>
          ) : null}
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total spent (your view)"
          paise={totals.totalExpenses}
          accent="green"
          icon={<ArrowUpRight className="size-4" />}
        />
        <MetricCard
          label="Income (your view)"
          paise={totals.totalIncome}
          accent="cyan"
          icon={<ArrowDownLeft className="size-4" />}
        />
        <MetricCard
          label="Shared project expenses"
          paise={sharedTotals.totalExpenses}
          hint="Visible to collaborators"
          accent="amber"
          icon={<Wallet className="size-4" />}
        />
        <MetricCard
          label="Advances (authorized)"
          paise={totals.totalAdvances}
          hint={pendingCount > 0 ? `${pendingCount} pending in ledger` : undefined}
          accent="purple"
          icon={<HandCoins className="size-4" />}
        />
      </section>

      <section className="surface-card flex flex-wrap items-center gap-3 rounded-2xl p-3 sm:p-4">
        <div className="flex h-10 min-w-[12rem] flex-1 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-muted-white">
          <Search className="size-4 shrink-0 opacity-70" />
          <span>Search transactions…</span>
          <kbd className="ml-auto hidden rounded border border-white/10 px-1.5 py-0.5 font-mono text-[10px] sm:inline">
            Soon
          </kbd>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          {["All", "Expense", "Income", "Advance", "Pending"].map((label) => (
            <span
              key={label}
              className={cn(
                "rounded-full border px-3 py-1.5",
                label === "All"
                  ? "border-cta/40 bg-cta/15 text-mint"
                  : "border-white/10 bg-white/[0.03] text-muted-white",
              )}
            >
              {label}
            </span>
          ))}
        </div>
        {canCreate ? (
          <Link
            href={`/p/${slug}/finance/new`}
            className={cn(buttonVariants({ size: "sm" }), "ml-auto")}
          >
            Add
          </Link>
        ) : null}
      </section>

      {transactions.length === 0 ? (
        <div className="surface-card rounded-2xl px-6 py-14 text-center">
          <p className="font-heading text-xl text-white">No transactions yet</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-white">
            Your construction expenses will appear here once the first payment
            is recorded.
          </p>
          {canCreate ? (
            <Link
              href={`/p/${slug}/finance/new`}
              className={cn(buttonVariants(), "mt-5")}
            >
              Add first transaction
            </Link>
          ) : null}
        </div>
      ) : (
        <>
          <div className="surface-card hidden overflow-hidden rounded-2xl md:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-muted-white">
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Number</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Visibility</th>
                  <th className="px-4 py-3 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr
                    key={tx.id}
                    className="border-b border-white/[0.06] transition-ki-fast last:border-0 hover:bg-white/[0.04]"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/p/${slug}/finance/${tx.id}`}
                        className="font-medium text-white hover:text-mint"
                      >
                        {formatDate(tx.transactionDate)}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-white">
                      {tx.transactionNumber}
                    </td>
                    <td className="px-4 py-3 text-muted-white">{tx.type}</td>
                    <td className="px-4 py-3 text-white/90">
                      {tx.category?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={statusTone(tx.status)}>{tx.status}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant="outline"
                        className="border-white/15 text-muted-white"
                      >
                        {tx.visibility.replaceAll("_", " ")}
                      </Badge>
                    </td>
                    <td
                      className={cn(
                        "px-4 py-3 text-right font-tabular font-semibold",
                        amountTone(tx.type, tx.direction),
                      )}
                    >
                      {formatInrFromPaise(tx.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-2 md:hidden">
            {transactions.map((tx) => (
              <Link
                key={tx.id}
                href={`/p/${slug}/finance/${tx.id}`}
                className="surface-card block rounded-2xl p-4 transition-ki-fast hover:border-white/20"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p
                      className={cn(
                        "font-tabular text-lg font-semibold",
                        amountTone(tx.type, tx.direction),
                      )}
                    >
                      {formatInrFromPaise(tx.amount)}
                    </p>
                    <p className="mt-1 truncate text-sm text-white">
                      {tx.category?.name ?? tx.type}
                    </p>
                    <p className="text-xs text-muted-white">
                      {formatDate(tx.transactionDate)} · {tx.transactionNumber}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge className={statusTone(tx.status)}>{tx.status}</Badge>
                    <Badge
                      variant="outline"
                      className="border-white/15 text-muted-white"
                    >
                      {tx.visibility.replaceAll("_", " ")}
                    </Badge>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
