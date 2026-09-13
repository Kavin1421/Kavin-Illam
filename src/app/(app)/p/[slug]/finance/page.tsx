import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDate } from "@/lib/dates";
import { formatInrFromPaise } from "@/lib/money";
import { cn } from "@/lib/utils";
import { roleHasPermission } from "@/server/authorization";
import { listTransactions } from "@/server/finance/transactions";

export const metadata: Metadata = {
  title: "Finance",
};

export default async function FinancePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { role, transactions, totals, sharedTotals } =
    await listTransactions(slug);
  const canCreate = roleHasPermission(role, "FINANCE_CREATE");

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h2 className="font-heading text-2xl tracking-tight">Finance</h2>
          <p className="text-muted-foreground text-sm">
            Project ledger with visibility-aware totals.
          </p>
        </div>
        {canCreate ? (
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
            <Link
              href={`/p/${slug}/finance/new`}
              className={cn(buttonVariants())}
            >
              Add transaction
            </Link>
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Your view · Expenses</CardDescription>
            <CardTitle className="text-xl">
              {formatInrFromPaise(totals.totalExpenses)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Your view · Income</CardDescription>
            <CardTitle className="text-xl">
              {formatInrFromPaise(totals.totalIncome)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Shared project expenses</CardDescription>
            <CardTitle className="text-xl">
              {formatInrFromPaise(sharedTotals.totalExpenses)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Advances (authorized)</CardDescription>
            <CardTitle className="text-xl">
              {formatInrFromPaise(totals.totalAdvances)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {transactions.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No transactions yet</CardTitle>
            <CardDescription>
              Record expenses, income, and advances for this project.
            </CardDescription>
          </CardHeader>
          {canCreate ? (
            <CardContent>
              <Link
                href={`/p/${slug}/finance/new`}
                className={cn(buttonVariants())}
              >
                Add first transaction
              </Link>
            </CardContent>
          ) : null}
        </Card>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-lg border md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/40 border-b">
                <tr>
                  <th className="px-3 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 font-medium">Number</th>
                  <th className="px-3 py-2 font-medium">Type</th>
                  <th className="px-3 py-2 font-medium">Category</th>
                  <th className="px-3 py-2 font-medium">Amount</th>
                  <th className="px-3 py-2 font-medium">Visibility</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id} className="border-b last:border-0">
                    <td className="px-3 py-2">
                      <Link
                        href={`/p/${slug}/finance/${tx.id}`}
                        className="hover:underline"
                      >
                        {formatDate(tx.transactionDate)}
                      </Link>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {tx.transactionNumber}
                    </td>
                    <td className="px-3 py-2">{tx.type}</td>
                    <td className="px-3 py-2">
                      {tx.category?.name ?? "—"}
                    </td>
                    <td className="px-3 py-2 font-medium">
                      {formatInrFromPaise(tx.amount)}
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant="outline">{tx.visibility}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 md:hidden">
            {transactions.map((tx) => (
              <Link
                key={tx.id}
                href={`/p/${slug}/finance/${tx.id}`}
                className="border-border block rounded-lg border p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">
                      {formatInrFromPaise(tx.amount)}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      {tx.category?.name ?? tx.type} ·{" "}
                      {formatDate(tx.transactionDate)}
                    </p>
                  </div>
                  <Badge variant="outline">{tx.visibility}</Badge>
                </div>
                <p className="text-muted-foreground mt-1 font-mono text-xs">
                  {tx.transactionNumber}
                </p>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
