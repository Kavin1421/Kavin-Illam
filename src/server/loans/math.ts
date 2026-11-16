/**
 * Home-loan principal math — integer paise only.
 * Isolated from construction Finance / Budget ledgers.
 */

export type LoanTxnRow = {
  id: string;
  type: string;
  amount: number;
  linkedDebitId?: string | null;
  deletedAt?: Date | null;
};

export type LoanBalances = {
  sanctioned: number;
  disbursed: number;
  spentConstruction: number;
  diverted: number;
  repaidRotational: number;
  openRotational: number;
  available: number;
};

function assertIntegerPaise(amount: number, label = "amount"): void {
  if (!Number.isInteger(amount)) {
    throw new Error(`${label} must be integer minor units (paise).`);
  }
}

function isActive(row: LoanTxnRow): boolean {
  return row.deletedAt == null;
}

export function computeLoanBalances(
  sanctionedPaise: number,
  rows: LoanTxnRow[],
): LoanBalances {
  assertIntegerPaise(sanctionedPaise, "sanctioned");
  let disbursed = 0;
  let spentConstruction = 0;
  let diverted = 0;
  let repaidRotational = 0;

  for (const row of rows) {
    if (!isActive(row)) continue;
    assertIntegerPaise(row.amount, "loan transaction amount");
    switch (row.type) {
      case "DISBURSEMENT":
        disbursed += row.amount;
        break;
      case "DEBIT_CONSTRUCTION":
        spentConstruction += row.amount;
        break;
      case "DEBIT_OTHER":
        diverted += row.amount;
        break;
      case "CREDIT_REPAYMENT":
        repaidRotational += row.amount;
        break;
      default:
        break;
    }
  }

  const openRotational = diverted - repaidRotational;
  const available =
    disbursed - spentConstruction - diverted + repaidRotational;

  return {
    sanctioned: sanctionedPaise,
    disbursed,
    spentConstruction,
    diverted,
    repaidRotational,
    openRotational,
    available,
  };
}

/** Sum of repayments linked to one DEBIT_OTHER row. */
export function repaidOnDebitPaise(
  debitId: string,
  rows: LoanTxnRow[],
): number {
  let total = 0;
  for (const row of rows) {
    if (!isActive(row)) continue;
    if (row.type !== "CREDIT_REPAYMENT") continue;
    if (row.linkedDebitId !== debitId) continue;
    assertIntegerPaise(row.amount);
    total += row.amount;
  }
  return total;
}

export function outstandingOnDebitPaise(
  debit: LoanTxnRow,
  rows: LoanTxnRow[],
): number {
  if (debit.type !== "DEBIT_OTHER") return 0;
  const repaid = repaidOnDebitPaise(debit.id, rows);
  return Math.max(0, debit.amount - repaid);
}

export type RotationalStatus = "OPEN" | "PARTIALLY_REPAID" | "REPAID";

export function rotationalStatusForDebit(
  debit: LoanTxnRow,
  rows: LoanTxnRow[],
): RotationalStatus {
  const outstanding = outstandingOnDebitPaise(debit, rows);
  if (outstanding <= 0) return "REPAID";
  if (outstanding < debit.amount) return "PARTIALLY_REPAID";
  return "OPEN";
}

export function interestRatePercentLabel(bps: number | null | undefined): string {
  if (bps == null || !Number.isInteger(bps)) return "—";
  return `${(bps / 100).toFixed(2)}%`;
}

export function tenureLabel(months: number | null | undefined): string {
  if (months == null || !Number.isInteger(months) || months <= 0) return "—";
  if (months % 12 === 0) {
    const years = months / 12;
    return years === 1 ? "1 year" : `${years} years`;
  }
  return months === 1 ? "1 month" : `${months} months`;
}
