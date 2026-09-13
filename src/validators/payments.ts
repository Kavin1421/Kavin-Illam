import { z } from "zod";

import { paymentMethodSchema, visibilitySchema } from "@/validators/finance";

export const createPaymentRequestSchema = z.object({
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  amountRupees: z.string().trim().min(1),
  categoryId: z.string().optional().or(z.literal("")),
  payeeName: z.string().trim().max(200).optional().or(z.literal("")),
  dueDate: z.string().optional().or(z.literal("")),
  visibility: visibilitySchema.default("PROJECT_SHARED"),
});

export const reviewPaymentRequestSchema = z.object({
  action: z.enum(["APPROVE", "REJECT", "REQUEST_CHANGES"]),
  reviewNote: z.string().trim().max(2000).optional().or(z.literal("")),
});

export const payPaymentRequestSchema = z.object({
  amountRupees: z.string().trim().min(1),
  paymentDate: z.string().min(1),
  accountId: z.string().optional().or(z.literal("")),
  paymentMethod: paymentMethodSchema.optional(),
  referenceNumber: z.string().trim().max(120).optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

export const resubmitPaymentRequestSchema = z.object({
  title: z.string().trim().min(2).max(160).optional(),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  amountRupees: z.string().trim().min(1).optional(),
});
