import { describe, expect, it } from "vitest";

import {
  computeAdvanceOutstanding,
  deriveAdvanceStatus,
} from "@/server/advances/outstanding";
import {
  canViewResource,
  includeInSharedProjectTotals,
} from "@/server/authorization/visibility";
import { roleHasPermission } from "@/server/authorization/permissions";
import { formatInrFromPaise, paiseFromRupeeString } from "@/lib/money";
import { sumAuthorizedFinanceTotals } from "@/server/finance/totals";
import {
  assertCanMarkPaid,
  derivePaymentRequestStatus,
} from "@/server/payments/invariants";
import { computeBudgetRollup } from "@/server/budget/math";

/**
 * Phase 15 — acceptance scenario condensed into automated checks.
 * Full UI path is exercised manually via seed users (see docs/ACCEPTANCE.md).
 */
describe("acceptance scenario invariants", () => {
  const projectId = "kavin-illam";
  const kevin = { userId: "kevin", role: "OWNER" as const };
  const engineer = { userId: "engineer", role: "ENGINEER" as const };

  const sharedAdvance = {
    projectId,
    visibility: "PROJECT_SHARED" as const,
    createdById: "kevin",
    allowedUserIds: [] as string[],
    deletedAt: null,
  };

  const privateExpense = {
    projectId,
    visibility: "PRIVATE" as const,
    createdById: "kevin",
    allowedUserIds: [] as string[],
    deletedAt: null,
  };

  it("parses acceptance INR amounts into integer paise", () => {
    expect(paiseFromRupeeString("500000")).toBe(50_000_000);
    expect(paiseFromRupeeString("1,25,000")).toBe(12_500_000);
    expect(paiseFromRupeeString("100000")).toBe(10_000_000);
    expect(paiseFromRupeeString("40000")).toBe(4_000_000);
    expect(formatInrFromPaise(50_000_000)).toContain("5,00,000");
    expect(formatInrFromPaise(40_000_000)).toContain("4,00,000");
  });

  it("engineer sees shared advance but not private personal expense", () => {
    expect(canViewResource(engineer, sharedAdvance, projectId)).toBe(true);
    expect(canViewResource(engineer, privateExpense, projectId)).toBe(false);
    expect(canViewResource(kevin, privateExpense, projectId)).toBe(true);
    expect(includeInSharedProjectTotals(privateExpense)).toBe(false);
  });

  it("settlement leaves ₹4,00,000 outstanding on ₹5,00,000 advance", () => {
    const breakdown = computeAdvanceOutstanding(50_000_000, [
      { kind: "SETTLEMENT", amount: 10_000_000 },
    ]);
    expect(breakdown.outstanding).toBe(40_000_000);
    expect(
      deriveAdvanceStatus({
        originalAmount: breakdown.originalAmount,
        outstanding: breakdown.outstanding,
      }),
    ).toBe("PARTIALLY_SETTLED");
  });

  it("cannot mark payment request PAID without linked transaction", () => {
    expect(() =>
      assertCanMarkPaid({
        linkedTransactionId: null,
        paidAmount: 12_500_000,
        paymentDate: new Date(),
      }),
    ).toThrow(/linked transaction/i);

    expect(
      derivePaymentRequestStatus({
        requestedAmount: 12_500_000,
        paidAmount: 12_500_000,
        hasLinkedTransaction: true,
      }),
    ).toBe("PAID");
  });

  it("shared dashboard totals exclude private ₹40,000 personal expense", () => {
    const rows = [
      {
        type: "ADVANCE" as const,
        direction: "OUTFLOW" as const,
        amount: 50_000_000,
        status: "PAID" as const,
        visibility: "PROJECT_SHARED" as const,
      },
      {
        type: "EXPENSE" as const,
        direction: "OUTFLOW" as const,
        amount: 12_500_000,
        status: "PAID" as const,
        visibility: "PROJECT_SHARED" as const,
      },
      {
        type: "EXPENSE" as const,
        direction: "OUTFLOW" as const,
        amount: 4_000_000,
        status: "PAID" as const,
        visibility: "PRIVATE" as const,
      },
    ];
    const shared = rows.filter((row) =>
      includeInSharedProjectTotals({
        projectId,
        visibility: row.visibility,
        createdById: "kevin",
      }),
    );
    const totals = sumAuthorizedFinanceTotals(shared);
    expect(totals.totalAdvances).toBe(50_000_000);
    expect(totals.totalExpenses).toBe(50_000_000 + 12_500_000);
    expect(totals.totalExpenses).not.toBe(50_000_000 + 12_500_000 + 4_000_000);
  });

  it("budget remaining stays coherent after shared paid spend", () => {
    const rollup = computeBudgetRollup({
      lines: [
        {
          categoryId: "eng",
          label: "Engineering",
          plannedAmount: 5_000_000_00,
        },
      ],
      totalPlannedOverride: 5_000_000_00,
      paid: [{ categoryId: "eng", amount: 50_000_000 }],
      commitments: [{ categoryId: "eng", amount: 12_500_000 }],
    });
    expect(rollup.totals.paid).toBe(50_000_000);
    expect(rollup.totals.committed).toBe(12_500_000);
    expect(rollup.totals.remainingVsPaid).toBe(5_000_000_00 - 50_000_000);
  });

  it("engineer cannot view audit logs by permission", () => {
    expect(roleHasPermission("ENGINEER", "AUDIT_VIEW")).toBe(false);
    expect(roleHasPermission("OWNER", "AUDIT_VIEW")).toBe(true);
  });
});
