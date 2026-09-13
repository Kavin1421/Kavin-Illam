import { describe, expect, it } from "vitest";

import { sumAuthorizedFinanceTotals } from "@/server/finance/totals";
import { includeInSharedProjectTotals } from "@/server/authorization/visibility";

describe("finance totals", () => {
  it("aggregates income, expenses, and advances in integer paise", () => {
    const totals = sumAuthorizedFinanceTotals([
      {
        type: "EXPENSE",
        direction: "OUTFLOW",
        amount: 12_500_000,
        status: "PAID",
        visibility: "PROJECT_SHARED",
      },
      {
        type: "ADVANCE",
        direction: "OUTFLOW",
        amount: 50_000_000,
        status: "PAID",
        visibility: "PROJECT_SHARED",
      },
      {
        type: "INCOME",
        direction: "INFLOW",
        amount: 10_000_000,
        status: "PAID",
        visibility: "PROJECT_SHARED",
      },
      {
        type: "EXPENSE",
        direction: "OUTFLOW",
        amount: 4_000_000,
        status: "PAID",
        visibility: "PRIVATE",
      },
    ]);

    expect(totals.totalIncome).toBe(10_000_000);
    expect(totals.totalAdvances).toBe(50_000_000);
    expect(totals.totalExpenses).toBe(12_500_000 + 50_000_000 + 4_000_000);
    expect(totals.netCashFlow).toBe(
      10_000_000 - (12_500_000 + 50_000_000 + 4_000_000),
    );
  });

  it("ignores draft and cancelled rows", () => {
    const totals = sumAuthorizedFinanceTotals([
      {
        type: "EXPENSE",
        direction: "OUTFLOW",
        amount: 100,
        status: "DRAFT",
        visibility: "PROJECT_SHARED",
      },
      {
        type: "EXPENSE",
        direction: "OUTFLOW",
        amount: 200,
        status: "CANCELLED",
        visibility: "PROJECT_SHARED",
      },
      {
        type: "EXPENSE",
        direction: "OUTFLOW",
        amount: 300,
        status: "PAID",
        visibility: "PROJECT_SHARED",
      },
    ]);
    expect(totals.totalExpenses).toBe(300);
  });

  it("keeps private rows out of shared project totals helper", () => {
    expect(
      includeInSharedProjectTotals({
        projectId: "p1",
        visibility: "PRIVATE",
        createdById: "u1",
      }),
    ).toBe(false);
  });
});
