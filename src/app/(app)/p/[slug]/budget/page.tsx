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
import { formatInrFromPaise } from "@/lib/money";
import { cn } from "@/lib/utils";
import { roleHasPermission } from "@/server/authorization";
import { getBudgetDashboard } from "@/server/budget/service";

export const metadata: Metadata = {
  title: "Budget",
};

export default async function BudgetPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { role, budget, rollup, project } = await getBudgetDashboard(slug);
  const canEdit = roleHasPermission(role, "BUDGET_EDIT");
  const mode = budget?.defaultRemainingMode ?? "VS_PAID";
  const remaining =
    mode === "VS_COMMITTED"
      ? rollup.totals.remainingVsCommitted
      : rollup.totals.remainingVsPaid;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h2 className="font-heading text-2xl tracking-tight">Budget</h2>
          <p className="text-muted-foreground text-sm">
            Planned vs committed vs paid — remaining modes are labeled, never
            mixed. Private ledger rows are excluded from shared figures.
          </p>
        </div>
        {canEdit ? (
          <Link
            href={`/p/${slug}/budget/edit`}
            className={cn(buttonVariants())}
          >
            {budget ? "Edit budget" : "Create budget"}
          </Link>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Planned</CardDescription>
            <CardTitle className="text-xl">
              {formatInrFromPaise(rollup.totals.planned)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Committed (open requests)</CardDescription>
            <CardTitle className="text-xl">
              {formatInrFromPaise(rollup.totals.committed)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Paid (shared ledger)</CardDescription>
            <CardTitle className="text-xl">
              {formatInrFromPaise(rollup.totals.paid)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>
              Remaining ({mode === "VS_COMMITTED" ? "vs committed" : "vs paid"})
            </CardDescription>
            <CardTitle className="text-xl">
              {formatInrFromPaise(remaining)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Remaining vs paid</CardDescription>
            <CardTitle className="text-lg">
              {formatInrFromPaise(rollup.totals.remainingVsPaid)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Remaining vs committed</CardDescription>
            <CardTitle className="text-lg">
              {formatInrFromPaise(rollup.totals.remainingVsCommitted)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {!budget ? (
        <Card>
          <CardHeader>
            <CardTitle>No active budget</CardTitle>
            <CardDescription>
              Project estimated budget:{" "}
              {project.estimatedBudget != null
                ? formatInrFromPaise(project.estimatedBudget)
                : "—"}
              . Create category lines to track variance.
            </CardDescription>
          </CardHeader>
          {canEdit ? (
            <CardContent>
              <Link
                href={`/p/${slug}/budget/edit`}
                className={cn(buttonVariants())}
              >
                Create budget
              </Link>
            </CardContent>
          ) : null}
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{budget.name}</Badge>
            <Badge variant="outline">{budget.status}</Badge>
          </div>

          <div className="hidden overflow-x-auto rounded-lg border md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/40 border-b">
                <tr>
                  <th className="px-3 py-2 font-medium">Category</th>
                  <th className="px-3 py-2 font-medium">Planned</th>
                  <th className="px-3 py-2 font-medium">Committed</th>
                  <th className="px-3 py-2 font-medium">Paid</th>
                  <th className="px-3 py-2 font-medium">Rem. vs paid</th>
                  <th className="px-3 py-2 font-medium">Variance (paid)</th>
                </tr>
              </thead>
              <tbody>
                {rollup.lines.map((line) => (
                  <tr
                    key={`${line.categoryId ?? "none"}-${line.label}`}
                    className="border-b last:border-0"
                  >
                    <td className="px-3 py-2">{line.label}</td>
                    <td className="px-3 py-2">
                      {formatInrFromPaise(line.planned)}
                    </td>
                    <td className="px-3 py-2">
                      {formatInrFromPaise(line.committed)}
                    </td>
                    <td className="px-3 py-2">
                      {formatInrFromPaise(line.paid)}
                    </td>
                    <td className="px-3 py-2 font-medium">
                      {formatInrFromPaise(line.remainingVsPaid)}
                    </td>
                    <td className="px-3 py-2">
                      {formatInrFromPaise(line.variancePaid)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 md:hidden">
            {rollup.lines.map((line) => (
              <div
                key={`${line.categoryId ?? "none"}-${line.label}-m`}
                className="border-border rounded-lg border p-3"
              >
                <p className="font-medium">{line.label}</p>
                <p className="text-muted-foreground mt-1 text-sm">
                  Planned {formatInrFromPaise(line.planned)} · Paid{" "}
                  {formatInrFromPaise(line.paid)}
                </p>
                <p className="text-sm">
                  Remaining vs paid: {formatInrFromPaise(line.remainingVsPaid)}
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
