import { describe, expect, it } from "vitest";

import {
  createLoanTransactionSchema,
  parseInterestRateBps,
  parseTenureMonths,
} from "./loans";

describe("loan validators", () => {
  it("parses interest rate into basis points", () => {
    expect(parseInterestRateBps("8.5")).toBe(850);
    expect(parseInterestRateBps("8.50%")).toBe(850);
    expect(parseInterestRateBps("")).toBeNull();
  });

  it("parses tenure months", () => {
    expect(parseTenureMonths("120")).toBe(120);
    expect(parseTenureMonths("")).toBeNull();
    expect(() => parseTenureMonths("abc")).toThrow(/whole number/);
  });

  it("requires linked debit for repayments", () => {
    const parsed = createLoanTransactionSchema.safeParse({
      type: "CREDIT_REPAYMENT",
      amountRupees: "10000",
      transactionDate: "2026-10-11",
      visibility: "PROJECT_SHARED",
    });
    expect(parsed.success).toBe(false);
  });

  it("accepts a construction debit", () => {
    const parsed = createLoanTransactionSchema.safeParse({
      type: "DEBIT_CONSTRUCTION",
      amountRupees: "500000",
      transactionDate: "2026-10-11",
      visibility: "PROJECT_SHARED",
    });
    expect(parsed.success).toBe(true);
  });

  it("requires payment screenshots for non-cash methods", () => {
    const parsed = createLoanTransactionSchema.safeParse({
      type: "DISBURSEMENT",
      amountRupees: "100000",
      transactionDate: "2026-10-11",
      paymentMethod: "UPI",
      visibility: "PROJECT_SHARED",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects more than three loan payment screenshots", () => {
    const items = Array.from({ length: 4 }, (_, index) => ({
      cloudinaryPublicId: `proofs/loan-${index}`,
      cloudinaryResourceType: "image",
      cloudinaryDeliveryType: "authenticated",
      proofFileName: `Payment-screenshot-${index + 1}.jpg`,
      proofMimeType: "image/jpeg",
      proofFileSize: 12_000,
      proofFormat: "jpg",
    }));
    const parsed = createLoanTransactionSchema.safeParse({
      type: "DISBURSEMENT",
      amountRupees: "100000",
      transactionDate: "2026-10-11",
      paymentMethod: "UPI",
      paymentProofsJson: JSON.stringify(items),
      visibility: "PROJECT_SHARED",
    });
    expect(parsed.success).toBe(false);
  });

  it("accepts up to three loan payment screenshots", () => {
    const items = Array.from({ length: 3 }, (_, index) => ({
      cloudinaryPublicId: `proofs/loan-${index}`,
      cloudinaryResourceType: "image",
      cloudinaryDeliveryType: "authenticated",
      proofFileName: `Payment-screenshot-${index + 1}.jpg`,
      proofMimeType: "image/jpeg",
      proofFileSize: 12_000,
      proofFormat: "jpg",
    }));
    const parsed = createLoanTransactionSchema.safeParse({
      type: "DISBURSEMENT",
      amountRupees: "100000",
      transactionDate: "2026-10-11",
      paymentMethod: "UPI",
      paymentProofsJson: JSON.stringify(items),
      visibility: "PROJECT_SHARED",
    });
    expect(parsed.success).toBe(true);
  });
});
