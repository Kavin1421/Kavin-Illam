import { z } from "zod";

import { paiseFromRupeeString } from "@/lib/money";
import {
  paymentProofUploadSchema,
  refineRequirePaymentProofUnlessCash,
} from "@/validators/payment-proof";

export const transactionTypeSchema = z.enum([
  "EXPENSE",
  "INCOME",
  "TRANSFER",
  "REFUND",
  "ADJUSTMENT",
  "ADVANCE",
  "SETTLEMENT",
]);

export const transactionStatusSchema = z.enum([
  "DRAFT",
  "PENDING",
  "APPROVED",
  "PAID",
  "PARTIALLY_PAID",
  "CANCELLED",
  "REJECTED",
  "REFUNDED",
]);

export const paymentMethodSchema = z.enum([
  "CASH",
  "BANK_TRANSFER",
  "UPI",
  "CARD",
  "CHEQUE",
  "NEFT",
  "RTGS",
  "IMPS",
  "OTHER",
]);

export const visibilitySchema = z.enum([
  "PRIVATE",
  "PROJECT_SHARED",
  "RESTRICTED",
]);

/** MERGED counts fully. OUT_OF_CONTRACT is tracked separately. SPLIT divides one payment. */
export const contractScopeSchema = z
  .enum(["MERGED", "OUT_OF_CONTRACT", "SPLIT"])
  .default("MERGED");

export function refineContractSplit(
  data: {
    amountRupees: string;
    contractScope: "MERGED" | "OUT_OF_CONTRACT" | "SPLIT";
    contractIncludedRupees?: string;
  },
  ctx: z.RefinementCtx,
) {
  if (data.contractScope !== "SPLIT") return;

  const raw = data.contractIncludedRupees?.trim() ?? "";
  if (!raw) {
    ctx.addIssue({
      code: "custom",
      message: "Enter how much of this payment is included in the contract.",
      path: ["contractIncludedRupees"],
    });
    return;
  }

  let total: number;
  let included: number;
  try {
    total = paiseFromRupeeString(data.amountRupees);
    included = paiseFromRupeeString(raw);
  } catch {
    ctx.addIssue({
      code: "custom",
      message: "Enter a valid amount included in the contract.",
      path: ["contractIncludedRupees"],
    });
    return;
  }

  if (included <= 0 || included >= total) {
    ctx.addIssue({
      code: "custom",
      message:
        "The contract portion must be more than zero and less than the full amount.",
      path: ["contractIncludedRupees"],
    });
  }
}

export const createTransactionSchema = z
  .object({
    amountRupees: z.string().trim().min(1),
    type: transactionTypeSchema,
    categoryId: z.string().optional().or(z.literal("")),
    accountId: z.string().optional().or(z.literal("")),
    paidTo: z.string().trim().max(200).optional().or(z.literal("")),
    paymentMethod: paymentMethodSchema.optional(),
    referenceNumber: z.string().trim().max(120).optional().or(z.literal("")),
    description: z.string().trim().max(500).optional().or(z.literal("")),
    notes: z.string().trim().max(2000).optional().or(z.literal("")),
    transactionDate: z.string().min(1),
    status: transactionStatusSchema.default("PAID"),
    visibility: visibilitySchema.default("PROJECT_SHARED"),
    contractScope: contractScopeSchema,
    contractIncludedRupees: z.string().trim().optional().or(z.literal("")),
  })
  .merge(paymentProofUploadSchema)
  .superRefine((data, ctx) => {
    if (data.status === "PAID" && !data.transactionDate) {
      ctx.addIssue({
        code: "custom",
        message: "Paid transactions require a payment date.",
        path: ["transactionDate"],
      });
    }
    refineRequirePaymentProofUnlessCash(data, ctx);
    refineContractSplit(data, ctx);
  });

export const updateTransactionSchema = z
  .object({
    amountRupees: z.string().trim().min(1),
    type: transactionTypeSchema,
    categoryId: z.string().optional().or(z.literal("")),
    accountId: z.string().optional().or(z.literal("")),
    paidTo: z.string().trim().max(200).optional().or(z.literal("")),
    paymentMethod: paymentMethodSchema.optional(),
    referenceNumber: z.string().trim().max(120).optional().or(z.literal("")),
    description: z.string().trim().max(500).optional().or(z.literal("")),
    notes: z.string().trim().max(2000).optional().or(z.literal("")),
    transactionDate: z.string().min(1),
    status: transactionStatusSchema.default("PAID"),
    visibility: visibilitySchema.default("PROJECT_SHARED"),
    contractScope: contractScopeSchema,
    contractIncludedRupees: z.string().trim().optional().or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    refineContractSplit(data, ctx);
  });

export const softDeleteTransactionSchema = z.object({
  reason: z.string().trim().min(3).max(500),
});
