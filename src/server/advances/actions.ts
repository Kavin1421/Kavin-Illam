"use server";

import { redirect } from "next/navigation";

import { AppError } from "@/lib/errors";
import {
  createAdvance,
  settleAdvance,
  softDeleteAdvance,
} from "@/server/advances/service";

export type AdvanceActionState = {
  error?: string;
  success?: string;
};

function formObject(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

export async function createAdvanceAction(
  slug: string,
  _prev: AdvanceActionState,
  formData: FormData,
): Promise<AdvanceActionState> {
  try {
    const advance = await createAdvance(slug, formObject(formData));
    redirect(`/p/${slug}/advances/${advance.id}`);
  } catch (error) {
    if (error instanceof AppError) {
      return { error: error.message };
    }
    throw error;
  }
}

export async function settleAdvanceAction(
  slug: string,
  advanceId: string,
  _prev: AdvanceActionState,
  formData: FormData,
): Promise<AdvanceActionState> {
  try {
    await settleAdvance(slug, advanceId, formObject(formData));
    redirect(`/p/${slug}/advances/${advanceId}`);
  } catch (error) {
    if (error instanceof AppError) {
      return { error: error.message };
    }
    throw error;
  }
}

export async function softDeleteAdvanceAction(
  slug: string,
  advanceId: string,
  formData: FormData,
): Promise<void> {
  await softDeleteAdvance(slug, advanceId, formObject(formData));
  redirect(`/p/${slug}/advances`);
}
