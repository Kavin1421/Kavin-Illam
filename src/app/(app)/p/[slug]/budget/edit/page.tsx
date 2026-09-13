import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  BudgetEditorForm,
  paiseToRupeeInput,
} from "@/components/budget/budget-forms";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AppError } from "@/lib/errors";
import { requireProjectPermissionBySlug } from "@/server/authorization";
import { getBudgetDashboard } from "@/server/budget/service";
import { listCategoriesForProject } from "@/server/finance/categories";

export const metadata: Metadata = {
  title: "Edit budget",
};

export default async function EditBudgetPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  try {
    await requireProjectPermissionBySlug(slug, "BUDGET_EDIT");
  } catch (error) {
    if (error instanceof AppError && error.code === "FORBIDDEN") {
      notFound();
    }
    throw error;
  }

  const [{ budget }, categories] = await Promise.all([
    getBudgetDashboard(slug),
    listCategoriesForProject(slug),
  ]);

  const initial = budget
    ? {
        name: budget.name,
        notes: budget.notes ?? "",
        totalPlannedRupees:
          budget.totalPlanned != null
            ? paiseToRupeeInput(budget.totalPlanned)
            : "",
        defaultRemainingMode: budget.defaultRemainingMode,
        lines: budget.categories.map((line) => ({
          key: line.id,
          categoryId: line.categoryId ?? "",
          label: line.label,
          plannedAmountRupees: paiseToRupeeInput(line.plannedAmount),
        })),
      }
    : undefined;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8 sm:px-6">
      <div className="space-y-1">
        <h2 className="font-heading text-2xl tracking-tight">
          {budget ? "Edit budget" : "Create budget"}
        </h2>
        <p className="text-muted-foreground text-sm">
          Planned amounts are stored as integer paise. Remaining is always shown
          as either vs paid or vs committed.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Budget lines</CardTitle>
          <CardDescription>
            Link lines to finance categories so paid and committed roll up.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BudgetEditorForm
            slug={slug}
            categories={categories.map((c) => ({
              id: c.id,
              name: c.name,
              code: c.code,
            }))}
            initial={initial}
          />
        </CardContent>
      </Card>

      <Link
        href={`/p/${slug}/budget`}
        className="text-muted-foreground text-sm underline-offset-4 hover:underline"
      >
        Back to budget
      </Link>
    </div>
  );
}
