import { z } from "zod";

import { paymentMethodSchema, visibilitySchema } from "@/validators/finance";

export const createAdvanceSchema = z.object({
  amountRupees: z.string().trim().min(1),
  recipientName: z.string().trim().min(1).max(200),
  categoryId: z.string().optional().or(z.literal("")),
  accountId: z.string().optional().or(z.literal("")),
  paymentMethod: paymentMethodSchema.optional(),
  referenceNumber: z.string().trim().max(120).optional().or(z.literal("")),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
  issuedAt: z.string().min(1),
  visibility: visibilitySchema.default("PROJECT_SHARED"),
});

export const settleAdvanceSchema = z.object({
  kind: z.enum(["SETTLEMENT", "REFUND"]).default("SETTLEMENT"),
  amountRupees: z.string().trim().min(1),
  settledAt: z.string().min(1),
  accountId: z.string().optional().or(z.literal("")),
  paymentMethod: paymentMethodSchema.optional(),
  referenceNumber: z.string().trim().max(120).optional().or(z.literal("")),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

export const softDeleteAdvanceSchema = z.object({
  reason: z.string().trim().min(3).max(500),
});
