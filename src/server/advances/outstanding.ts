import type { AdvanceSettlementKind, AdvanceStatus } from "@prisma/client";

/**
 * Server-only outstanding formula (single source of truth):
 * outstanding = originalAmount - sum(settlements) - sum(refunds)
 *
 * UI must display this result; never re-derive as truth.
 */

export type SettlementLike = {
  kind: AdvanceSettlementKind | string;
  amount: number;
  deletedAt?: Date | null;
};

export type OutstandingBreakdown = {
  originalAmount: number;
  settledAmount: number;
  refundedAmount: number;
  outstanding: number;
};

export function computeAdvanceOutstanding(
  originalAmount: number,
  settlements: readonly SettlementLike[],
): OutstandingBreakdown {
  if (!Number.isInteger(originalAmount) || originalAmount < 0) {
    throw new Error("Advance originalAmount must be a non-negative integer.");
  }

  let settledAmount = 0;
  let refundedAmount = 0;

  for (const row of settlements) {
    if (row.deletedAt) continue;
    if (!Number.isInteger(row.amount) || row.amount < 0) {
      throw new Error("Settlement amounts must be non-negative integers.");
    }
    if (row.kind === "REFUND") {
      refundedAmount += row.amount;
    } else if (row.kind === "SETTLEMENT") {
      settledAmount += row.amount;
    } else {
      throw new Error(`Unknown settlement kind: ${row.kind}`);
    }
  }

  const outstanding = originalAmount - settledAmount - refundedAmount;
  if (outstanding < 0) {
    throw new Error("Outstanding cannot be negative.");
  }

  return {
    originalAmount,
    settledAmount,
    refundedAmount,
    outstanding,
  };
}

export function deriveAdvanceStatus(params: {
  cancelled?: boolean;
  originalAmount: number;
  outstanding: number;
}): AdvanceStatus {
  if (params.cancelled) return "CANCELLED";
  if (params.outstanding === 0) return "SETTLED";
  if (params.outstanding < params.originalAmount) return "PARTIALLY_SETTLED";
  return "OPEN";
}

/** Guard used before writing a settlement/refund. */
export function assertSettlementWithinOutstanding(
  outstanding: number,
  amount: number,
): void {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error("Settlement amount must be a positive integer.");
  }
  if (amount > outstanding) {
    throw new Error("Settlement cannot exceed outstanding advance.");
  }
}
