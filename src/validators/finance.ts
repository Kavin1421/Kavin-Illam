import { z } from "zod";

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
  })
  .superRefine((data, ctx) => {
    if (data.status === "PAID" && !data.transactionDate) {
      ctx.addIssue({
        code: "custom",
        message: "Paid transactions require a payment date.",
        path: ["transactionDate"],
      });
    }
  });

export const softDeleteTransactionSchema = z.object({
  reason: z.string().trim().min(3).max(500),
});
