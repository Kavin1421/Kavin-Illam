import { describe, expect, it } from "vitest";

import {
  computeBudgetRollup,
  openCommitmentFromRequest,
} from "@/server/budget/math";

describe("budget math", () => {
  it("computes remaining vs paid and vs committed separately", () => {
    const { lines, totals } = computeBudgetRollup({
      lines: [
        { categoryId: "cement", label: "Cement", plannedAmount: 20_000_000 },
        { categoryId: "steel", label: "Steel", plannedAmount: 30_000_000 },
      ],
      paid: [
        { categoryId: "cement", amount: 12_500_000 },
        { categoryId: "steel", amount: 7_500_000 },
      ],
      commitments: [
        { categoryId: "cement", amount: 2_500_000 },
        { categoryId: "steel", amount: 3_500_000 },
      ],
    });

    expect(totals.planned).toBe(50_000_000);
    expect(totals.paid).toBe(20_000_000);
    expect(totals.committed).toBe(6_000_000);
    expect(totals.remainingVsPaid).toBe(30_000_000);
    expect(totals.remainingVsCommitted).toBe(44_000_000);
    expect(totals.variancePaid).toBe(-30_000_000);

    expect(lines[0]?.remainingVsPaid).toBe(7_500_000);
    expect(lines[1]?.remainingVsCommitted).toBe(26_500_000);
  });

  it("uses totalPlanned override without mixing modes", () => {
    const { totals } = computeBudgetRollup({
      lines: [{ label: "Only line", plannedAmount: 10_000_000 }],
      totalPlannedOverride: 50_000_000,
      paid: [{ amount: 5_000_000 }],
      commitments: [{ amount: 8_000_000 }],
    });
    expect(totals.planned).toBe(50_000_000);
    expect(totals.remainingVsPaid).toBe(45_000_000);
    expect(totals.remainingVsCommitted).toBe(42_000_000);
  });

  it("derives open commitment from payment request status", () => {
    expect(
      openCommitmentFromRequest({
        status: "APPROVED",
        amount: 3_500_000,
        paidAmount: 0,
      }),
    ).toBe(3_500_000);

    expect(
      openCommitmentFromRequest({
        status: "PARTIALLY_PAID",
        amount: 3_500_000,
        paidAmount: 1_000_000,
      }),
    ).toBe(2_500_000);

    expect(
      openCommitmentFromRequest({
        status: "PAID",
        amount: 3_500_000,
        paidAmount: 3_500_000,
      }),
    ).toBe(0);

    expect(
      openCommitmentFromRequest({
        status: "REJECTED",
        amount: 3_500_000,
        paidAmount: 0,
      }),
    ).toBe(0);
  });

  it("rejects non-integer money", () => {
    expect(() =>
      computeBudgetRollup({
        lines: [{ label: "Bad", plannedAmount: 10.5 }],
        paid: [],
        commitments: [],
      }),
    ).toThrow(/integer/i);
  });
});
