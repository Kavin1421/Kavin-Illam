"use server";

import { redirect } from "next/navigation";

import { AppError, toUserMessage } from "@/lib/errors";
import { createAccount } from "@/server/finance/accounts";
import { createTransaction, softDeleteTransaction } from "@/server/finance/transactions";

export type FinanceActionState = {
  error?: string;
  success?: string;
};

function formObject(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

export async function createTransactionAction(
  slug: string,
  _prev: FinanceActionState,
  formData: FormData,
): Promise<FinanceActionState> {
  try {
    const tx = await createTransaction(slug, formObject(formData));
    redirect(`/p/${slug}/finance/${tx.id}`);
  } catch (error) {
    if (error instanceof AppError) {
      return { error: error.message };
    }
    throw error;
  }
}

export async function createAccountAction(
  slug: string,
  _prev: FinanceActionState,
  formData: FormData,
): Promise<FinanceActionState> {
  try {
    await createAccount(slug, formObject(formData));
    return { success: "Account created." };
  } catch (error) {
    return { error: toUserMessage(error) };
  }
}

export async function softDeleteTransactionAction(
  slug: string,
  transactionId: string,
  formData: FormData,
): Promise<void> {
  await softDeleteTransaction(slug, transactionId, formObject(formData));
  redirect(`/p/${slug}/finance`);
}
