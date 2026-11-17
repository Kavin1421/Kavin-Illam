import { z } from "zod";

import { paiseFromRupeeString } from "@/lib/money";
import { paymentMethodSchema, visibilitySchema } from "@/validators/finance";
import {
  paymentProofUploadSchema,
  refineRequirePaymentProofUnlessCash,
} from "@/validators/payment-proof";

/** Screenshots per Home Loan transaction (stricter than Finance). */
export const MAX_LOAN_PAYMENT_PROOFS = 3;

export const loanTransactionTypeSchema = z.enum([
  "DISBURSEMENT",
  "DEBIT_CONSTRUCTION",
  "DEBIT_OTHER",
  "CREDIT_REPAYMENT",
]);

export const createLoanFacilitySchema = z.object({
  lenderName: z.string().trim().max(120).optional().or(z.literal("")),
  sanctionedRupees: z.string().trim().min(1, "Enter the sanctioned amount."),
  interestRatePercent: z.string().trim().max(20).optional().or(z.literal("")),
  tenureMonths: z.string().trim().max(10).optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

export const updateLoanFacilitySchema = createLoanFacilitySchema;

export const createLoanTransactionSchema = z
  .object({
    type: loanTransactionTypeSchema,
    amountRupees: z.string().trim().min(1, "Enter an amount."),
    transactionDate: z.string().trim().min(1, "Enter a date."),
    paidTo: z.string().trim().max(200).optional().or(z.literal("")),
    paymentMethod: z
      .union([paymentMethodSchema, z.literal("")])
      .optional(),
    referenceNumber: z.string().trim().max(120).optional().or(z.literal("")),
    description: z.string().trim().max(500).optional().or(z.literal("")),
    notes: z.string().trim().max(2000).optional().or(z.literal("")),
    linkedDebitId: z.string().trim().max(40).optional().or(z.literal("")),
    visibility: visibilitySchema.default("PROJECT_SHARED"),
  })
  .merge(paymentProofUploadSchema)
  .superRefine((data, ctx) => {
    if (data.type === "CREDIT_REPAYMENT" && !data.linkedDebitId?.trim()) {
      ctx.addIssue({
        code: "custom",
        message: "Choose which diversion this repayment closes.",
        path: ["linkedDebitId"],
      });
    }
    refineRequirePaymentProofUnlessCash(data, ctx, MAX_LOAN_PAYMENT_PROOFS);
  });

export const updateLoanTransactionSchema = z.object({
  amountRupees: z.string().trim().min(1, "Enter an amount."),
  transactionDate: z.string().trim().min(1, "Enter a date."),
  paidTo: z.string().trim().max(200).optional().or(z.literal("")),
  paymentMethod: z.union([paymentMethodSchema, z.literal("")]).optional(),
  referenceNumber: z.string().trim().max(120).optional().or(z.literal("")),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
  visibility: visibilitySchema.default("PROJECT_SHARED"),
});

export const softDeleteLoanTransactionSchema = z.object({
  deletionReason: z.string().trim().max(500).optional().or(z.literal("")),
});

export function parseInterestRateBps(raw?: string): number | null {
  const value = raw?.trim() ?? "";
  if (!value) return null;
  const normalized = value.replace(/%/g, "").trim();
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    throw new Error("Interest rate must be a number like 8.5.");
  }
  const [whole, fraction = ""] = normalized.split(".");
  const bps =
    Number.parseInt(whole, 10) * 100 +
    Number.parseInt((fraction + "00").slice(0, 2), 10);
  if (bps < 0 || bps > 100_00) {
    throw new Error("Interest rate must be between 0 and 100%.");
  }
  return bps;
}

export function parseTenureMonths(raw?: string): number | null {
  const value = raw?.trim() ?? "";
  if (!value) return null;
  if (!/^\d+$/.test(value)) {
    throw new Error("Tenure must be a whole number of months.");
  }
  const months = Number.parseInt(value, 10);
  if (months <= 0 || months > 600) {
    throw new Error("Tenure must be between 1 and 600 months.");
  }
  return months;
}

export function parsePositivePaise(rupees: string): number {
  const amount = paiseFromRupeeString(rupees);
  if (amount <= 0) {
    throw new Error("Amount must be greater than zero.");
  }
  return amount;
}
