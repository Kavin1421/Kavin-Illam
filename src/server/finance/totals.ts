import type { TransactionDirection, TransactionType } from "@prisma/client";

/**
 * Pure integer money aggregations — never use floats.
 */

export type LedgerRow = {
  type: TransactionType | string;
  direction: TransactionDirection | string;
  amount: number;
  status: string;
  visibility: string;
};

export type FinanceTotals = {
  totalIncome: number;
  totalExpenses: number;
  netCashFlow: number;
  totalAdvances: number;
  paidCount: number;
};

const PAID_STATUSES = new Set(["PAID", "PARTIALLY_PAID", "APPROVED"]);

export function sumAuthorizedFinanceTotals(
  rows: readonly LedgerRow[],
): FinanceTotals {
  let totalIncome = 0;
  let totalExpenses = 0;
  let totalAdvances = 0;
  let paidCount = 0;

  for (const row of rows) {
    if (!Number.isInteger(row.amount)) {
      throw new Error("Transaction amounts must be integer minor units.");
    }
    if (row.status === "CANCELLED" || row.status === "REJECTED") continue;
    if (
      !PAID_STATUSES.has(row.status) &&
      row.status !== "DRAFT" &&
      row.status !== "PENDING"
    ) {
      // still count PAID-like; DRAFT/PENDING excluded from cash totals
    }
    if (row.status === "DRAFT" || row.status === "PENDING") continue;

    if (row.type === "INCOME" || row.direction === "INFLOW") {
      totalIncome += row.amount;
    }
    if (
      row.type === "EXPENSE" ||
      (row.direction === "OUTFLOW" &&
        row.type !== "ADVANCE" &&
        row.type !== "TRANSFER")
    ) {
      totalExpenses += row.amount;
    }
    if (row.type === "ADVANCE") {
      totalAdvances += row.amount;
      // Advances are outflows but tracked separately; still count as expense cash leave
      totalExpenses += row.amount;
    }
    if (PAID_STATUSES.has(row.status)) {
      paidCount += 1;
    }
  }

  return {
    totalIncome,
    totalExpenses,
    netCashFlow: totalIncome - totalExpenses,
    totalAdvances,
    paidCount,
  };
}

export function defaultDirectionForType(
  type: TransactionType,
): TransactionDirection {
  switch (type) {
    case "INCOME":
    case "REFUND":
      return "INFLOW";
    case "TRANSFER":
    case "SETTLEMENT":
      return "INTERNAL";
    default:
      return "OUTFLOW";
  }
}
