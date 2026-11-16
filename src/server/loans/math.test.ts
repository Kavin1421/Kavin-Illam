import { describe, expect, it } from "vitest";

import {
  computeLoanBalances,
  outstandingOnDebitPaise,
  repaidOnDebitPaise,
  rotationalStatusForDebit,
} from "./math";

describe("loan math", () => {
  const sanctioned = 50_30_000_00; // ₹50,30,000

  it("tracks disbursement, construction, diversion, and repayment", () => {
    const rows = [
      { id: "d1", type: "DISBURSEMENT", amount: 25_00_000_00 },
      { id: "c1", type: "DEBIT_CONSTRUCTION", amount: 5_00_000_00 },
      { id: "o1", type: "DEBIT_OTHER", amount: 10_000_00 },
      {
        id: "r1",
        type: "CREDIT_REPAYMENT",
        amount: 10_000_00,
        linkedDebitId: "o1",
      },
    ];

    const balances = computeLoanBalances(sanctioned, rows);
    expect(balances.disbursed).toBe(25_00_000_00);
    expect(balances.spentConstruction).toBe(5_00_000_00);
    expect(balances.diverted).toBe(10_000_00);
    expect(balances.repaidRotational).toBe(10_000_00);
    expect(balances.openRotational).toBe(0);
    expect(balances.available).toBe(20_00_000_00);
  });

  it("keeps rotational outstanding until fully repaid", () => {
    const rows = [
      { id: "d1", type: "DISBURSEMENT", amount: 25_00_000_00 },
      { id: "o1", type: "DEBIT_OTHER", amount: 10_000_00 },
      {
        id: "r1",
        type: "CREDIT_REPAYMENT",
        amount: 4_000_00,
        linkedDebitId: "o1",
      },
    ];
    const debit = rows[1]!;
    expect(repaidOnDebitPaise("o1", rows)).toBe(4_000_00);
    expect(outstandingOnDebitPaise(debit, rows)).toBe(6_000_00);
    expect(rotationalStatusForDebit(debit, rows)).toBe("PARTIALLY_REPAID");

    const balances = computeLoanBalances(sanctioned, rows);
    expect(balances.openRotational).toBe(6_000_00);
    expect(balances.available).toBe(24_94_000_00);
  });

  it("ignores soft-deleted rows", () => {
    const rows = [
      { id: "d1", type: "DISBURSEMENT", amount: 10_00_000_00 },
      {
        id: "c1",
        type: "DEBIT_CONSTRUCTION",
        amount: 1_00_000_00,
        deletedAt: new Date(),
      },
    ];
    expect(computeLoanBalances(sanctioned, rows).available).toBe(10_00_000_00);
  });
});
