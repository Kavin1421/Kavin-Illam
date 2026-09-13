import { z } from "zod";

/** Cloudinary fields posted with finance forms for payment screenshots. */
export const paymentProofUploadSchema = z.object({
  cloudinaryPublicId: z.string().trim().max(500).optional().or(z.literal("")),
  cloudinaryResourceType: z
    .enum(["image", "raw", "video"])
    .optional()
    .or(z.literal("")),
  cloudinaryDeliveryType: z
    .literal("authenticated")
    .optional()
    .or(z.literal("")),
  proofFileName: z.string().trim().max(200).optional().or(z.literal("")),
  proofMimeType: z.string().trim().max(120).optional().or(z.literal("")),
  proofFileSize: z.coerce.number().int().nonnegative().optional(),
  proofFormat: z.string().trim().max(40).optional().or(z.literal("")),
});

export type PaymentProofUpload = z.infer<typeof paymentProofUploadSchema>;

export function paymentMethodRequiresProof(
  paymentMethod: string | null | undefined,
): boolean {
  return Boolean(paymentMethod && paymentMethod !== "CASH");
}

export function hasPaymentProofUpload(
  data: PaymentProofUpload,
): data is PaymentProofUpload & {
  cloudinaryPublicId: string;
  cloudinaryResourceType: "image" | "raw" | "video";
  proofFileName: string;
  proofMimeType: string;
  proofFileSize: number;
} {
  return Boolean(
    data.cloudinaryPublicId?.trim() &&
      data.cloudinaryResourceType &&
      data.proofFileName?.trim() &&
      data.proofMimeType?.trim() &&
      typeof data.proofFileSize === "number" &&
      data.proofFileSize > 0,
  );
}

export function refineRequirePaymentProofUnlessCash<
  T extends { paymentMethod?: string } & PaymentProofUpload,
>(data: T, ctx: z.RefinementCtx) {
  if (!paymentMethodRequiresProof(data.paymentMethod)) return;
  if (hasPaymentProofUpload(data)) return;
  ctx.addIssue({
    code: "custom",
    message:
      "Upload a payment screenshot when the payment method is not cash.",
    path: ["cloudinaryPublicId"],
  });
}
