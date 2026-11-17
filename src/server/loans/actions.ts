"use server";

import { redirect } from "next/navigation";

import { AppError, toUserMessage } from "@/lib/errors";
import {
  createLoanFacility,
  createLoanTransaction,
  sendOpenDiversionReminders,
  softDeleteLoanTransaction,
  updateLoanFacility,
  updateLoanTransaction,
} from "@/server/loans/service";

export type LoanActionState = {
  error?: string;
  success?: string;
};

function formObject(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

export async function createLoanFacilityAction(
  slug: string,
  _prev: LoanActionState,
  formData: FormData,
): Promise<LoanActionState> {
  try {
    await createLoanFacility(slug, formObject(formData));
    redirect(`/p/${slug}/loans`);
  } catch (error) {
    if (error instanceof AppError) {
      return { error: error.message };
    }
    throw error;
  }
}

export async function updateLoanFacilityAction(
  slug: string,
  _prev: LoanActionState,
  formData: FormData,
): Promise<LoanActionState> {
  try {
    await updateLoanFacility(slug, formObject(formData));
    return { success: "Home Loan details saved." };
  } catch (error) {
    return { error: toUserMessage(error) };
  }
}

export async function createLoanTransactionAction(
  slug: string,
  _prev: LoanActionState,
  formData: FormData,
): Promise<LoanActionState> {
  try {
    const txn = await createLoanTransaction(slug, formObject(formData));
    redirect(`/p/${slug}/loans/${txn.id}`);
  } catch (error) {
    if (error instanceof AppError) {
      return { error: error.message };
    }
    throw error;
  }
}

export async function updateLoanTransactionAction(
  slug: string,
  transactionId: string,
  _prev: LoanActionState,
  formData: FormData,
): Promise<LoanActionState> {
  try {
    await updateLoanTransaction(slug, transactionId, formObject(formData));
    redirect(`/p/${slug}/loans/${transactionId}`);
  } catch (error) {
    if (error instanceof AppError) {
      return { error: error.message };
    }
    throw error;
  }
}

export async function softDeleteLoanTransactionAction(
  slug: string,
  transactionId: string,
  formData: FormData,
): Promise<void> {
  await softDeleteLoanTransaction(slug, transactionId, formObject(formData));
  redirect(`/p/${slug}/loans`);
}

export async function sendOpenDiversionRemindersAction(
  slug: string,
): Promise<LoanActionState> {
  try {
    const result = await sendOpenDiversionReminders(slug);
    return { success: result.message };
  } catch (error) {
    return { error: toUserMessage(error) };
  }
}
