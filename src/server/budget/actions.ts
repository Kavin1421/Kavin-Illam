"use server";

import { redirect } from "next/navigation";

import { AppError } from "@/lib/errors";
import { upsertProjectBudget } from "@/server/budget/service";

export type BudgetActionState = {
  error?: string;
  success?: string;
};

function formObject(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

export async function upsertBudgetAction(
  slug: string,
  _prev: BudgetActionState,
  formData: FormData,
): Promise<BudgetActionState> {
  try {
    await upsertProjectBudget(slug, formObject(formData));
    redirect(`/p/${slug}/budget`);
  } catch (error) {
    if (error instanceof AppError) {
      return { error: error.message };
    }
    throw error;
  }
}
