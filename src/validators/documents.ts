import { z } from "zod";

import { visibilitySchema } from "@/validators/finance";

export const documentCategorySchema = z.enum([
  "CONTRACT",
  "BOND",
  "AGREEMENT",
  "INVOICE",
  "RECEIPT",
  "PAYMENT_PROOF",
  "QUOTATION",
  "ESTIMATE",
  "PLAN",
  "DRAWING",
  "APPROVAL",
  "GOVERNMENT_DOCUMENT",
  "IDENTITY_DOCUMENT",
  "WARRANTY",
  "CERTIFICATE",
  "PHOTO",
  "OTHER",
]);

export const signUploadSchema = z.object({
  fileName: z.string().trim().min(1).max(200),
  mimeType: z.string().trim().max(120),
  fileSize: z.coerce.number().int().positive(),
  documentId: z.string().optional(),
});

export const createDocumentSchema = z.object({
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  category: documentCategorySchema.default("OTHER"),
  tags: z.string().trim().max(500).optional().or(z.literal("")),
  visibility: visibilitySchema.default("PROJECT_SHARED"),
  cloudinaryPublicId: z.string().trim().min(3).max(500),
  cloudinaryResourceType: z.enum(["image", "raw", "video"]),
  cloudinaryDeliveryType: z.literal("authenticated").default("authenticated"),
  fileName: z.string().trim().min(1).max(200),
  mimeType: z.string().trim().min(1).max(120),
  fileSize: z.coerce.number().int().positive(),
  format: z.string().trim().max(40).optional().or(z.literal("")),
  issueDate: z.string().optional().or(z.literal("")),
  expiryDate: z.string().optional().or(z.literal("")),
});

export const addDocumentVersionSchema = z.object({
  documentId: z.string().min(1),
  changeDescription: z.string().trim().max(500).optional().or(z.literal("")),
  cloudinaryPublicId: z.string().trim().min(3).max(500),
  cloudinaryResourceType: z.enum(["image", "raw", "video"]),
  cloudinaryDeliveryType: z.literal("authenticated").default("authenticated"),
  fileName: z.string().trim().min(1).max(200),
  mimeType: z.string().trim().min(1).max(120),
  fileSize: z.coerce.number().int().positive(),
  format: z.string().trim().max(40).optional().or(z.literal("")),
});

export const restoreDocumentVersionSchema = z.object({
  versionId: z.string().min(1),
});
