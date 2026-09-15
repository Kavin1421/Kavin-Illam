import { describe, expect, it } from "vitest";

import { createTransactionSchema } from "@/validators/finance";
import {
  hasPaymentProofUpload,
  paymentMethodRequiresProof,
} from "@/validators/payment-proof";

describe("payment proof requirement", () => {
  it("requires proof for non-cash methods", () => {
    expect(paymentMethodRequiresProof("UPI")).toBe(true);
    expect(paymentMethodRequiresProof("BANK_TRANSFER")).toBe(true);
    expect(paymentMethodRequiresProof("CASH")).toBe(false);
    expect(paymentMethodRequiresProof(undefined)).toBe(false);
  });

  it("rejects non-cash transaction without screenshot", () => {
    const parsed = createTransactionSchema.safeParse({
      amountRupees: "1000",
      type: "EXPENSE",
      paymentMethod: "UPI",
      transactionDate: "2026-09-14",
      status: "PAID",
      visibility: "PROJECT_SHARED",
    });
    expect(parsed.success).toBe(false);
  });

  it("allows cash without screenshot", () => {
    const parsed = createTransactionSchema.safeParse({
      amountRupees: "1000",
      type: "EXPENSE",
      paymentMethod: "CASH",
      transactionDate: "2026-09-14",
      status: "PAID",
      visibility: "PROJECT_SHARED",
    });
    expect(parsed.success).toBe(true);
  });

  it("allows non-cash when proof fields are present", () => {
    const proof = {
      cloudinaryPublicId: "kavin-illam/proj/documents/upi-shot",
      cloudinaryResourceType: "image" as const,
      cloudinaryDeliveryType: "authenticated" as const,
      proofFileName: "upi.png",
      proofMimeType: "image/png",
      proofFileSize: 12000,
      proofFormat: "png",
    };
    expect(hasPaymentProofUpload(proof)).toBe(true);
    const parsed = createTransactionSchema.safeParse({
      amountRupees: "1000",
      type: "EXPENSE",
      paymentMethod: "UPI",
      transactionDate: "2026-09-14",
      status: "PAID",
      visibility: "PROJECT_SHARED",
      ...proof,
    });
    expect(parsed.success).toBe(true);
  });

  it("allows up to five screenshots via paymentProofsJson", () => {
    const items = Array.from({ length: 5 }, (_, i) => ({
      cloudinaryPublicId: `kavin-illam/proj/documents/shot-${i}`,
      cloudinaryResourceType: "image",
      cloudinaryDeliveryType: "authenticated",
      proofFileName: `shot-${i}.png`,
      proofMimeType: "image/png",
      proofFileSize: 1000 + i,
      proofFormat: "png",
    }));
    const parsed = createTransactionSchema.safeParse({
      amountRupees: "1000",
      type: "EXPENSE",
      paymentMethod: "UPI",
      transactionDate: "2026-09-14",
      status: "PAID",
      visibility: "PROJECT_SHARED",
      paymentProofsJson: JSON.stringify(items),
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects more than five screenshots", () => {
    const items = Array.from({ length: 6 }, (_, i) => ({
      cloudinaryPublicId: `kavin-illam/proj/documents/shot-${i}`,
      cloudinaryResourceType: "image",
      cloudinaryDeliveryType: "authenticated",
      proofFileName: `shot-${i}.png`,
      proofMimeType: "image/png",
      proofFileSize: 1000 + i,
      proofFormat: "png",
    }));
    const parsed = createTransactionSchema.safeParse({
      amountRupees: "1000",
      type: "EXPENSE",
      paymentMethod: "UPI",
      transactionDate: "2026-09-14",
      status: "PAID",
      visibility: "PROJECT_SHARED",
      paymentProofsJson: JSON.stringify(items),
    });
    expect(parsed.success).toBe(false);
  });
});
