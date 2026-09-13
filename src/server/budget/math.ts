/**
 * Budget rollup math — integer paise only.
 * Remaining modes are explicit and never mixed.
 */

export type BudgetLineInput = {
  id?: string;
  categoryId?: string | null;
  label: string;
  plannedAmount: number;
};

export type PaidSlice = {
  categoryId?: string | null;
  amount: number;
};

export type CommitmentSlice = {
  categoryId?: string | null;
  /** Open obligation in paise (requested − already paid on the request) */
  amount: number;
};

export type BudgetLineRollup = {
  categoryId: string | null;
  label: string;
  planned: number;
  committed: number;
  paid: number;
  remainingVsPaid: number;
  remainingVsCommitted: number;
  variancePaid: number;
  varianceCommitted: number;
};

export type BudgetTotals = {
  planned: number;
  committed: number;
  paid: number;
  remainingVsPaid: number;
  remainingVsCommitted: number;
  variancePaid: number;
  varianceCommitted: number;
};

export function assertIntegerPaise(amount: number, label = "amount"): void {
  if (!Number.isInteger(amount)) {
    throw new Error(`${label} must be integer minor units (paise).`);
  }
}

/**
 * Committed open obligation from a payment request.
 * Fully PAID / REJECTED / CANCELLED → 0.
 */
export function openCommitmentFromRequest(params: {
  status: string;
  amount: number;
  paidAmount: number;
}): number {
  assertIntegerPaise(params.amount, "request amount");
  assertIntegerPaise(params.paidAmount, "paid amount");
  if (
    params.status === "REJECTED" ||
    params.status === "CANCELLED" ||
    params.status === "PAID"
  ) {
    return 0;
  }
  if (
    params.status === "PENDING" ||
    params.status === "CHANGES_REQUESTED" ||
    params.status === "APPROVED" ||
    params.status === "PARTIALLY_PAID"
  ) {
    const open = params.amount - params.paidAmount;
    return open > 0 ? open : 0;
  }
  return 0;
}

/** Paid cash from ledger row types that consume budget. */
export function isBudgetConsumingLedgerType(type: string): boolean {
  return type === "EXPENSE" || type === "ADVANCE";
}

export function computeBudgetRollup(params: {
  lines: readonly BudgetLineInput[];
  /** When set, overrides sum of line planned amounts */
  totalPlannedOverride?: number | null;
  paid: readonly PaidSlice[];
  commitments: readonly CommitmentSlice[];
}): { lines: BudgetLineRollup[]; totals: BudgetTotals } {
  const lines: BudgetLineRollup[] = params.lines.map((line) => {
    assertIntegerPaise(line.plannedAmount, "plannedAmount");
    if (line.plannedAmount < 0) {
      throw new Error("plannedAmount cannot be negative.");
    }

    const key = line.categoryId ?? null;
    let paid = 0;
    for (const slice of params.paid) {
      assertIntegerPaise(slice.amount, "paid");
      if ((slice.categoryId ?? null) === key) paid += slice.amount;
    }
    let committed = 0;
    for (const slice of params.commitments) {
      assertIntegerPaise(slice.amount, "committed");
      if ((slice.categoryId ?? null) === key) committed += slice.amount;
    }

    return {
      categoryId: key,
      label: line.label,
      planned: line.plannedAmount,
      committed,
      paid,
      remainingVsPaid: line.plannedAmount - paid,
      remainingVsCommitted: line.plannedAmount - committed,
      variancePaid: paid - line.plannedAmount,
      varianceCommitted: committed - line.plannedAmount,
    };
  });

  // Unallocated paid/committed (no matching budget line category) rolls into totals only
  const lineKeys = new Set(lines.map((l) => l.categoryId));
  let unallocatedPaid = 0;
  for (const slice of params.paid) {
    if (!lineKeys.has(slice.categoryId ?? null)) {
      unallocatedPaid += slice.amount;
    }
  }
  let unallocatedCommitted = 0;
  for (const slice of params.commitments) {
    if (!lineKeys.has(slice.categoryId ?? null)) {
      unallocatedCommitted += slice.amount;
    }
  }

  const plannedFromLines = lines.reduce((sum, l) => sum + l.planned, 0);
  let planned = plannedFromLines;
  if (params.totalPlannedOverride != null) {
    assertIntegerPaise(params.totalPlannedOverride, "totalPlanned");
    planned = params.totalPlannedOverride;
  }

  const committed =
    lines.reduce((sum, l) => sum + l.committed, 0) + unallocatedCommitted;
  const paid = lines.reduce((sum, l) => sum + l.paid, 0) + unallocatedPaid;

  const totals: BudgetTotals = {
    planned,
    committed,
    paid,
    remainingVsPaid: planned - paid,
    remainingVsCommitted: planned - committed,
    variancePaid: paid - planned,
    varianceCommitted: committed - planned,
  };

  return { lines, totals };
}
