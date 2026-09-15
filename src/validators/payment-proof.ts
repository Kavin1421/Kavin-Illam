import { z } from "zod";

/** Max payment screenshots / proof files per transaction. */
export const MAX_PAYMENT_PROOFS = 5;

/** Single Cloudinary proof file fields. */
export const paymentProofItemSchema = z.object({
  cloudinaryPublicId: z.string().trim().min(1).max(500),
  cloudinaryResourceType: z.enum(["image", "raw", "video"]),
  cloudinaryDeliveryType: z
    .literal("authenticated")
    .optional()
    .or(z.literal("")),
  proofFileName: z.string().trim().min(1).max(200),
  proofMimeType: z.string().trim().min(1).max(120),
  proofFileSize: z.coerce.number().int().positive(),
  proofFormat: z.string().trim().max(40).optional().or(z.literal("")),
});

export type PaymentProofItem = z.infer<typeof paymentProofItemSchema>;

/**
 * Form fields for payment screenshots.
 * Prefer `paymentProofsJson` (1–5 items). Legacy single-file fields still work.
 */
export const paymentProofUploadSchema = z.object({
  paymentProofsJson: z.string().trim().max(50_000).optional().or(z.literal("")),
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

/**
 * Normalize form payload into 0–5 validated proof items.
 * Prefers JSON array; falls back to legacy single-file fields.
 */
export function extractPaymentProofs(
  data: PaymentProofUpload,
): PaymentProofItem[] {
  const raw = data.paymentProofsJson?.trim();
  if (raw) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw) as unknown;
    } catch {
      throw new Error("Invalid payment proof payload.");
    }
    if (!Array.isArray(parsed)) {
      throw new Error("Payment proofs must be a list.");
    }
    if (parsed.length > MAX_PAYMENT_PROOFS) {
      throw new Error(
        `You can upload at most ${MAX_PAYMENT_PROOFS} payment screenshots.`,
      );
    }
    const items: PaymentProofItem[] = [];
    for (const entry of parsed) {
      const result = paymentProofItemSchema.safeParse(entry);
      if (!result.success) {
        throw new Error("One or more payment screenshots are invalid.");
      }
      items.push(result.data);
    }
    return items;
  }

  if (hasPaymentProofUpload(data)) {
    return [
      {
        cloudinaryPublicId: data.cloudinaryPublicId,
        cloudinaryResourceType: data.cloudinaryResourceType,
        cloudinaryDeliveryType: data.cloudinaryDeliveryType || "authenticated",
        proofFileName: data.proofFileName,
        proofMimeType: data.proofMimeType,
        proofFileSize: data.proofFileSize,
        proofFormat: data.proofFormat || "",
      },
    ];
  }

  return [];
}

export function refineRequirePaymentProofUnlessCash<
  T extends { paymentMethod?: string } & PaymentProofUpload,
>(data: T, ctx: z.RefinementCtx) {
  if (!paymentMethodRequiresProof(data.paymentMethod)) return;

  let proofs: PaymentProofItem[] = [];
  try {
    proofs = extractPaymentProofs(data);
  } catch (error) {
    ctx.addIssue({
      code: "custom",
      message:
        error instanceof Error
          ? error.message
          : "Upload valid payment screenshots.",
      path: ["paymentProofsJson"],
    });
    return;
  }

  if (proofs.length === 0) {
    ctx.addIssue({
      code: "custom",
      message:
        "Upload at least one payment screenshot when the payment method is not cash.",
      path: ["paymentProofsJson"],
    });
  }
}
