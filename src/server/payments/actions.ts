"use server";

import { redirect } from "next/navigation";

import { AppError } from "@/lib/errors";
import {
  createPaymentRequest,
  payPaymentRequest,
  resubmitPaymentRequest,
  reviewPaymentRequest,
} from "@/server/payments/service";

export type PaymentActionState = {
  error?: string;
  success?: string;
};

function formObject(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

export async function createPaymentRequestAction(
  slug: string,
  _prev: PaymentActionState,
  formData: FormData,
): Promise<PaymentActionState> {
  try {
    const request = await createPaymentRequest(slug, formObject(formData));
    redirect(`/p/${slug}/payment-requests/${request.id}`);
  } catch (error) {
    if (error instanceof AppError) {
      return { error: error.message };
    }
    throw error;
  }
}

export async function reviewPaymentRequestAction(
  slug: string,
  requestId: string,
  _prev: PaymentActionState,
  formData: FormData,
): Promise<PaymentActionState> {
  try {
    await reviewPaymentRequest(slug, requestId, formObject(formData));
    redirect(`/p/${slug}/payment-requests/${requestId}`);
  } catch (error) {
    if (error instanceof AppError) {
      return { error: error.message };
    }
    throw error;
  }
}

export async function payPaymentRequestAction(
  slug: string,
  requestId: string,
  _prev: PaymentActionState,
  formData: FormData,
): Promise<PaymentActionState> {
  try {
    await payPaymentRequest(slug, requestId, formObject(formData));
    redirect(`/p/${slug}/payment-requests/${requestId}`);
  } catch (error) {
    if (error instanceof AppError) {
      return { error: error.message };
    }
    throw error;
  }
}

export async function resubmitPaymentRequestAction(
  slug: string,
  requestId: string,
  _prev: PaymentActionState,
  formData: FormData,
): Promise<PaymentActionState> {
  try {
    await resubmitPaymentRequest(slug, requestId, formObject(formData));
    redirect(`/p/${slug}/payment-requests/${requestId}`);
  } catch (error) {
    if (error instanceof AppError) {
      return { error: error.message };
    }
    throw error;
  }
}
