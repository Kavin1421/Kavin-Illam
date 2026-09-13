import { describe, expect, it } from "vitest";

import {
  assertCanMarkPaid,
  assertCanPay,
  assertValidReviewTransition,
  derivePaymentRequestStatus,
} from "@/server/payments/invariants";

describe("payment request invariants", () => {
  it("rejects PAID without a linked transaction", () => {
    expect(() =>
      assertCanMarkPaid({
        linkedTransactionId: null,
        paidAmount: 100,
        paymentDate: new Date(),
      }),
    ).toThrow(/linked transaction/i);

    expect(() =>
      derivePaymentRequestStatus({
        requestedAmount: 100,
        paidAmount: 100,
        hasLinkedTransaction: false,
      }),
    ).toThrow(/linked transaction/i);
  });

  it("requires payment date and positive paid amount", () => {
    expect(() =>
      assertCanMarkPaid({
        linkedTransactionId: "tx1",
        paidAmount: 0,
        paymentDate: new Date(),
      }),
    ).toThrow(/positive/i);

    expect(() =>
      assertCanMarkPaid({
        linkedTransactionId: "tx1",
        paidAmount: 100,
        paymentDate: null,
      }),
    ).toThrow(/payment date/i);
  });

  it("derives PAID vs PARTIALLY_PAID from amounts", () => {
    expect(
      derivePaymentRequestStatus({
        requestedAmount: 10_000,
        paidAmount: 10_000,
        hasLinkedTransaction: true,
      }),
    ).toBe("PAID");

    expect(
      derivePaymentRequestStatus({
        requestedAmount: 10_000,
        paidAmount: 4_000,
        hasLinkedTransaction: true,
      }),
    ).toBe("PARTIALLY_PAID");
  });

  it("allows review only from PENDING or CHANGES_REQUESTED", () => {
    expect(() =>
      assertValidReviewTransition("PENDING", "APPROVED"),
    ).not.toThrow();
    expect(() => assertValidReviewTransition("APPROVED", "REJECTED")).toThrow(
      /cannot reject/i,
    );
  });

  it("allows pay only from APPROVED", () => {
    expect(() => assertCanPay("APPROVED")).not.toThrow();
    expect(() => assertCanPay("PENDING")).toThrow(/approved/i);
    expect(() => assertCanPay("PAID")).toThrow(/approved/i);
  });
});
