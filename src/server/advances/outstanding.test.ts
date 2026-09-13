import { describe, expect, it } from "vitest";

import {
  assertSettlementWithinOutstanding,
  computeAdvanceOutstanding,
  deriveAdvanceStatus,
} from "@/server/advances/outstanding";

describe("advance outstanding", () => {
  it("computes outstanding = original - settlements - refunds", () => {
    const result = computeAdvanceOutstanding(50_000_000, [
      { kind: "SETTLEMENT", amount: 10_000_000 },
      { kind: "REFUND", amount: 5_000_000 },
      { kind: "SETTLEMENT", amount: 2_500_000, deletedAt: new Date() },
    ]);

    expect(result.originalAmount).toBe(50_000_000);
    expect(result.settledAmount).toBe(10_000_000);
    expect(result.refundedAmount).toBe(5_000_000);
    expect(result.outstanding).toBe(35_000_000);
  });

  it("matches acceptance scenario: ₹5,00,000 − ₹1,00,000 = ₹4,00,000", () => {
    const result = computeAdvanceOutstanding(50_000_000, [
      { kind: "SETTLEMENT", amount: 10_000_000 },
    ]);
    expect(result.outstanding).toBe(40_000_000);
    expect(
      deriveAdvanceStatus({
        originalAmount: result.originalAmount,
        outstanding: result.outstanding,
      }),
    ).toBe("PARTIALLY_SETTLED");
  });

  it("rejects settlements that exceed outstanding", () => {
    expect(() => assertSettlementWithinOutstanding(100, 101)).toThrow(
      /exceed outstanding/i,
    );
    expect(() => assertSettlementWithinOutstanding(100, 100)).not.toThrow();
  });

  it("derives advance status from outstanding", () => {
    expect(deriveAdvanceStatus({ originalAmount: 100, outstanding: 100 })).toBe(
      "OPEN",
    );
    expect(deriveAdvanceStatus({ originalAmount: 100, outstanding: 40 })).toBe(
      "PARTIALLY_SETTLED",
    );
    expect(deriveAdvanceStatus({ originalAmount: 100, outstanding: 0 })).toBe(
      "SETTLED",
    );
    expect(
      deriveAdvanceStatus({
        cancelled: true,
        originalAmount: 100,
        outstanding: 100,
      }),
    ).toBe("CANCELLED");
  });

  it("never allows negative outstanding from active rows", () => {
    expect(() =>
      computeAdvanceOutstanding(100, [{ kind: "SETTLEMENT", amount: 150 }]),
    ).toThrow(/negative/i);
  });
});
