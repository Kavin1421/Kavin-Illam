import type { PaymentMethod, Visibility } from "@prisma/client";

import { AppError } from "@/lib/errors";
import { formatInrFromPaise } from "@/lib/money";
import { actorLabel, recordAuditEvent } from "@/server/audit/record";
import {
  canViewResource,
  requireProjectPermissionBySlug,
  type VisibleResource,
} from "@/server/authorization";
import { prisma } from "@/server/db/prisma";
import { notDeleted } from "@/server/db/soft-delete";
import { allocateLoanNumber } from "@/server/finance/numbering";
import {
  computeLoanBalances,
  outstandingOnDebitPaise,
  repaidOnDebitPaise,
  rotationalStatusForDebit,
  type LoanTxnRow,
  type RotationalStatus,
} from "@/server/loans/math";
import {
  loanTxnListInclude,
  type LoanFacility,
  type LoanLedgerRow,
  type LoanTxnDetail,
  type LoanTxnListItem,
} from "@/server/loans/types";
import {
  createLoanFacilitySchema,
  createLoanTransactionSchema,
  parseInterestRateBps,
  parsePositivePaise,
  parseTenureMonths,
  softDeleteLoanTransactionSchema,
  updateLoanFacilitySchema,
  updateLoanTransactionSchema,
} from "@/validators/loans";

/** Minimal typed surface — avoids stale Prisma.*Delegate names in the IDE. */
type LoanTxnWriteResult = {
  id: string;
  loanNumber: string;
  type: string;
  amount: number;
};

type LoanDb = {
  loanFacility: {
    findFirst: (args?: object) => Promise<LoanFacility | null>;
    create: (args: object) => Promise<LoanFacility>;
    update: (args: object) => Promise<LoanFacility>;
  };
  loanTransaction: {
    findFirst: (args?: object) => Promise<LoanTxnDetail | null>;
    findMany: (args?: object) => Promise<LoanTxnListItem[]>;
    create: (args: object) => Promise<LoanTxnWriteResult>;
    update: (args: object) => Promise<LoanTxnWriteResult>;
    count: (args?: object) => Promise<number>;
  };
};

const loanDb = prisma as unknown as LoanDb;

function toVisibleResource(row: {
  projectId: string;
  createdById: string;
  visibility: Visibility | LoanTxnListItem["visibility"];
  allowedUserIds: string[];
  deletedAt?: Date | null;
}): VisibleResource {
  return {
    projectId: row.projectId,
    createdById: row.createdById,
    visibility: row.visibility as Visibility,
    allowedUserIds: row.allowedUserIds,
    deletedAt: row.deletedAt ?? null,
  };
}

function asTxnRows(
  rows: Array<{
    id: string;
    type: string;
    amount: number;
    linkedDebitId?: string | null;
    deletedAt?: Date | null;
  }>,
): LoanTxnRow[] {
  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    amount: row.amount,
    linkedDebitId: row.linkedDebitId,
    deletedAt: row.deletedAt ?? null,
  }));
}

function toLoanTxnRow(row: {
  id: string;
  type: string;
  amount: number;
  linkedDebitId?: string | null;
  deletedAt?: Date | null;
}): LoanTxnRow {
  return {
    id: row.id,
    type: row.type,
    amount: row.amount,
    linkedDebitId: row.linkedDebitId,
    deletedAt: row.deletedAt ?? null,
  };
}

function paymentMethodOrNull(value?: string): PaymentMethod | null {
  if (!value || value.trim() === "") return null;
  return value as PaymentMethod;
}

function annotateTxn<T extends LoanTxnRow>(row: T, txnRows: LoanTxnRow[]) {
  const repaid =
    row.type === "DEBIT_OTHER" ? repaidOnDebitPaise(row.id, txnRows) : 0;
  const outstanding =
    row.type === "DEBIT_OTHER" ? outstandingOnDebitPaise(row, txnRows) : 0;
  const rotationalStatus: RotationalStatus | null =
    row.type === "DEBIT_OTHER" ? rotationalStatusForDebit(row, txnRows) : null;
  return { repaid, outstanding, rotationalStatus };
}

export type { LoanLedgerRow };

async function loadLoanTxnList(
  facilityId: string,
): Promise<LoanTxnListItem[]> {
  return loanDb.loanTransaction.findMany({
    where: { facilityId, ...notDeleted },
    include: loanTxnListInclude,
    orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }],
  });
}

async function loadFacilityOrThrow(projectId: string): Promise<LoanFacility> {
  const facility = await loanDb.loanFacility.findFirst({
    where: { projectId, ...notDeleted },
  });
  if (!facility) {
    throw new AppError(
      "NOT_FOUND",
      "Set up the Home Loan facility before recording transactions.",
    );
  }
  return facility;
}

type ActiveLoanTxnRow = {
  id: string;
  type: string;
  amount: number;
  linkedDebitId: string | null;
  deletedAt: Date | null;
  description: string | null;
  paidTo: string | null;
  loanNumber: string;
  transactionDate: Date;
};

async function loadActiveTxnRows(
  facilityId: string,
): Promise<ActiveLoanTxnRow[]> {
  const rows = await loanDb.loanTransaction.findMany({
    where: { facilityId, ...notDeleted },
    select: {
      id: true,
      type: true,
      amount: true,
      linkedDebitId: true,
      deletedAt: true,
      description: true,
      paidTo: true,
      loanNumber: true,
      transactionDate: true,
    },
    orderBy: { transactionDate: "desc" },
  });
  return rows as unknown as ActiveLoanTxnRow[];
}

export async function getLoanOverview(slug: string) {
  const ctx = await requireProjectPermissionBySlug(slug, "LOAN_VIEW");
  const facility = await loanDb.loanFacility.findFirst({
    where: { projectId: ctx.project.id, ...notDeleted },
  });

  if (!facility) {
    const empty: LoanLedgerRow[] = [];
    return {
      project: ctx.project,
      role: ctx.role,
      facility: null,
      balances: null,
      transactions: empty,
      openDiversions: empty,
    };
  }

  const rows = await loadActiveTxnRows(facility.id);
  const txnRows = asTxnRows(rows);
  const balances = computeLoanBalances(facility.sanctionedAmount, txnRows);

  const txnList = await loadLoanTxnList(facility.id);

  const viewer = { userId: ctx.user.id, role: ctx.role };
  const visible: LoanTxnListItem[] = txnList.filter((row: LoanTxnListItem) =>
    canViewResource(viewer, toVisibleResource(row), ctx.project.id),
  );

  const transactions: LoanLedgerRow[] = visible.map(
    (row: LoanTxnListItem): LoanLedgerRow => ({
      ...row,
      ...annotateTxn(toLoanTxnRow(row), txnRows),
    }),
  );

  const openDiversions = transactions.filter(
    (row: LoanLedgerRow) =>
      row.type === "DEBIT_OTHER" &&
      row.rotationalStatus !== "REPAID" &&
      row.outstanding > 0,
  );

  return {
    project: ctx.project,
    role: ctx.role,
    facility,
    balances,
    transactions,
    openDiversions,
  };
}

export async function getLoanTransaction(slug: string, transactionId: string) {
  const ctx = await requireProjectPermissionBySlug(slug, "LOAN_VIEW");
  const facility = await loadFacilityOrThrow(ctx.project.id);

  const txn = await loanDb.loanTransaction.findFirst({
    where: {
      id: transactionId,
      projectId: ctx.project.id,
      facilityId: facility.id,
    },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      linkedDebit: {
        select: {
          id: true,
          loanNumber: true,
          amount: true,
          description: true,
          paidTo: true,
          transactionDate: true,
          type: true,
        },
      },
      repayments: {
        where: { ...notDeleted },
        select: {
          id: true,
          loanNumber: true,
          amount: true,
          transactionDate: true,
          description: true,
        },
        orderBy: { transactionDate: "asc" },
      },
      proofDocument: {
        select: {
          id: true,
          title: true,
          documentNumber: true,
          fileName: true,
          mimeType: true,
        },
      },
    },
  });

  if (!txn || txn.deletedAt) {
    throw new AppError("NOT_FOUND", "Loan transaction was not found.");
  }

  if (
    !canViewResource(
      { userId: ctx.user.id, role: ctx.role },
      toVisibleResource(txn),
      ctx.project.id,
    )
  ) {
    throw new AppError("NOT_FOUND", "Loan transaction was not found.");
  }

  const rows = await loadActiveTxnRows(facility.id);
  const txnRows = asTxnRows(rows);
  const balances = computeLoanBalances(facility.sanctionedAmount, txnRows);

  let repaid = 0;
  let outstanding = 0;
  let rotationalStatus: RotationalStatus | null = null;

  if (txn.type === "DEBIT_OTHER") {
    const annotated = annotateTxn(toLoanTxnRow(txn), txnRows);
    repaid = annotated.repaid;
    outstanding = annotated.outstanding;
    rotationalStatus = annotated.rotationalStatus;
  } else if (txn.type === "CREDIT_REPAYMENT" && txn.linkedDebit) {
    const debitRow: LoanTxnRow = {
      id: txn.linkedDebit.id,
      type: "DEBIT_OTHER",
      amount: txn.linkedDebit.amount,
    };
    outstanding = outstandingOnDebitPaise(debitRow, txnRows);
    rotationalStatus = rotationalStatusForDebit(debitRow, txnRows);
  }

  return {
    project: ctx.project,
    role: ctx.role,
    facility,
    balances,
    transaction: {
      ...txn,
      repaid,
      outstanding,
      rotationalStatus,
    },
  };
}

export async function createLoanFacility(slug: string, input: unknown) {
  const ctx = await requireProjectPermissionBySlug(slug, "LOAN_CREATE");
  const parsed = createLoanFacilitySchema.safeParse(input);
  if (!parsed.success) {
    throw new AppError(
      "VALIDATION",
      parsed.error.issues[0]?.message ?? "Please check the facility details.",
    );
  }

  const existing = await loanDb.loanFacility.findFirst({
    where: { projectId: ctx.project.id, ...notDeleted },
  });
  if (existing) {
    throw new AppError(
      "CONFLICT",
      "This project already has a Home Loan facility.",
    );
  }

  let sanctionedAmount: number;
  let interestRateBps: number | null;
  let tenureMonths: number | null;
  try {
    sanctionedAmount = parsePositivePaise(parsed.data.sanctionedRupees);
    interestRateBps = parseInterestRateBps(parsed.data.interestRatePercent);
    tenureMonths = parseTenureMonths(parsed.data.tenureMonths);
  } catch (error) {
    throw new AppError(
      "VALIDATION",
      error instanceof Error ? error.message : "Invalid facility values.",
    );
  }

  const facility = await loanDb.loanFacility.create({
    data: {
      projectId: ctx.project.id,
      kind: "HOME_LOAN",
      lenderName: parsed.data.lenderName?.trim() || null,
      sanctionedAmount,
      interestRateBps,
      tenureMonths,
      notes: parsed.data.notes?.trim() || null,
      createdById: ctx.user.id,
    },
  });

  await recordAuditEvent({
    projectId: ctx.project.id,
    actorId: ctx.user.id,
    action: "CREATE",
    entityType: "LoanFacility",
    entityId: facility.id,
    metadata: { sanctionedAmount },
    activity: {
      message: `${actorLabel(ctx.user)} set up the Home Loan (${formatInrFromPaise(sanctionedAmount)} sanctioned).`,
      href: `/p/${slug}/loans`,
    },
  });

  return facility;
}

export async function updateLoanFacility(slug: string, input: unknown) {
  const ctx = await requireProjectPermissionBySlug(slug, "LOAN_EDIT");
  const parsed = updateLoanFacilitySchema.safeParse(input);
  if (!parsed.success) {
    throw new AppError(
      "VALIDATION",
      parsed.error.issues[0]?.message ?? "Please check the facility details.",
    );
  }

  const facility = await loadFacilityOrThrow(ctx.project.id);
  const rows = await loadActiveTxnRows(facility.id);
  const balances = computeLoanBalances(
    facility.sanctionedAmount,
    asTxnRows(rows),
  );

  let sanctionedAmount: number;
  let interestRateBps: number | null;
  let tenureMonths: number | null;
  try {
    sanctionedAmount = parsePositivePaise(parsed.data.sanctionedRupees);
    interestRateBps = parseInterestRateBps(parsed.data.interestRatePercent);
    tenureMonths = parseTenureMonths(parsed.data.tenureMonths);
  } catch (error) {
    throw new AppError(
      "VALIDATION",
      error instanceof Error ? error.message : "Invalid facility values.",
    );
  }

  if (sanctionedAmount < balances.disbursed) {
    throw new AppError(
      "VALIDATION",
      `Sanctioned amount cannot be below disbursed ${formatInrFromPaise(balances.disbursed)}.`,
    );
  }

  const updated = await loanDb.loanFacility.update({
    where: { id: facility.id },
    data: {
      lenderName: parsed.data.lenderName?.trim() || null,
      sanctionedAmount,
      interestRateBps,
      tenureMonths,
      notes: parsed.data.notes?.trim() || null,
    },
  });

  await recordAuditEvent({
    projectId: ctx.project.id,
    actorId: ctx.user.id,
    action: "UPDATE",
    entityType: "LoanFacility",
    entityId: facility.id,
    metadata: { sanctionedAmount },
    activity: {
      message: `${actorLabel(ctx.user)} updated the Home Loan facility.`,
      href: `/p/${slug}/loans`,
    },
  });

  return updated;
}

export async function createLoanTransaction(slug: string, input: unknown) {
  const ctx = await requireProjectPermissionBySlug(slug, "LOAN_CREATE");
  const parsed = createLoanTransactionSchema.safeParse(input);
  if (!parsed.success) {
    throw new AppError(
      "VALIDATION",
      parsed.error.issues[0]?.message ?? "Please check the transaction details.",
    );
  }

  const facility = await loadFacilityOrThrow(ctx.project.id);
  let amount: number;
  try {
    amount = parsePositivePaise(parsed.data.amountRupees);
  } catch (error) {
    throw new AppError(
      "VALIDATION",
      error instanceof Error ? error.message : "Invalid amount.",
    );
  }

  const transactionDate = new Date(parsed.data.transactionDate);
  if (Number.isNaN(transactionDate.getTime())) {
    throw new AppError("VALIDATION", "Invalid transaction date.");
  }

  const rows = await loadActiveTxnRows(facility.id);
  const txnRows = asTxnRows(rows);
  const balances = computeLoanBalances(facility.sanctionedAmount, txnRows);
  const type = parsed.data.type;

  let linkedDebitId: string | null = null;

  if (type === "DISBURSEMENT") {
    if (balances.disbursed + amount > facility.sanctionedAmount) {
      throw new AppError(
        "VALIDATION",
        `Disbursement would exceed sanctioned ${formatInrFromPaise(facility.sanctionedAmount)}. Available to disburse: ${formatInrFromPaise(facility.sanctionedAmount - balances.disbursed)}.`,
      );
    }
  } else if (type === "DEBIT_CONSTRUCTION" || type === "DEBIT_OTHER") {
    if (amount > balances.available) {
      throw new AppError(
        "VALIDATION",
        `Only ${formatInrFromPaise(balances.available)} is available in the loan wallet.`,
      );
    }
  } else if (type === "CREDIT_REPAYMENT") {
    linkedDebitId = parsed.data.linkedDebitId?.trim() || null;
    if (!linkedDebitId) {
      throw new AppError("VALIDATION", "Choose the diversion being repaid.");
    }
    const debit = rows.find((row) => row.id === linkedDebitId);
    if (!debit || debit.type !== "DEBIT_OTHER") {
      throw new AppError("VALIDATION", "Linked diversion was not found.");
    }
    const outstanding = outstandingOnDebitPaise(debit, txnRows);
    if (amount > outstanding) {
      throw new AppError(
        "VALIDATION",
        `Only ${formatInrFromPaise(outstanding)} is still open on this diversion.`,
      );
    }
  }

  const loanNumber = await allocateLoanNumber({
    projectId: ctx.project.id,
    projectSlug: ctx.project.slug,
  });

  const txn = await loanDb.loanTransaction.create({
    data: {
      projectId: ctx.project.id,
      facilityId: facility.id,
      loanNumber,
      type,
      amount,
      transactionDate,
      paidTo: parsed.data.paidTo?.trim() || null,
      paymentMethod: paymentMethodOrNull(parsed.data.paymentMethod),
      referenceNumber: parsed.data.referenceNumber?.trim() || null,
      description: parsed.data.description?.trim() || null,
      notes: parsed.data.notes?.trim() || null,
      linkedDebitId,
      visibility: parsed.data.visibility,
      allowedUserIds: [],
      createdById: ctx.user.id,
    },
  });

  await recordAuditEvent({
    projectId: ctx.project.id,
    actorId: ctx.user.id,
    action: "CREATE",
    entityType: "LoanTransaction",
    entityId: txn.id,
    metadata: { type, amount, loanNumber },
    activity: {
      message: `${actorLabel(ctx.user)} recorded ${formatInrFromPaise(amount)} loan ${typeLabel(type)} (${loanNumber}).`,
      href: `/p/${slug}/loans/${txn.id}`,
    },
  });

  return txn;
}

export async function updateLoanTransaction(
  slug: string,
  transactionId: string,
  input: unknown,
) {
  const ctx = await requireProjectPermissionBySlug(slug, "LOAN_EDIT");
  const parsed = updateLoanTransactionSchema.safeParse(input);
  if (!parsed.success) {
    throw new AppError(
      "VALIDATION",
      parsed.error.issues[0]?.message ?? "Please check the transaction details.",
    );
  }

  const facility = await loadFacilityOrThrow(ctx.project.id);
  const existing = await loanDb.loanTransaction.findFirst({
    where: {
      id: transactionId,
      projectId: ctx.project.id,
      facilityId: facility.id,
      ...notDeleted,
    },
  });
  if (!existing) {
    throw new AppError("NOT_FOUND", "Loan transaction was not found.");
  }

  let amount: number;
  try {
    amount = parsePositivePaise(parsed.data.amountRupees);
  } catch (error) {
    throw new AppError(
      "VALIDATION",
      error instanceof Error ? error.message : "Invalid amount.",
    );
  }

  const transactionDate = new Date(parsed.data.transactionDate);
  if (Number.isNaN(transactionDate.getTime())) {
    throw new AppError("VALIDATION", "Invalid transaction date.");
  }

  const rows = await loadActiveTxnRows(facility.id);
  const others = asTxnRows(rows).filter((row) => row.id !== existing.id);
  const projected: LoanTxnRow[] = [
    ...others,
    {
      id: existing.id,
      type: existing.type,
      amount,
      linkedDebitId: existing.linkedDebitId,
      deletedAt: null,
    },
  ];
  const balances = computeLoanBalances(facility.sanctionedAmount, projected);

  if (balances.disbursed > facility.sanctionedAmount) {
    throw new AppError(
      "VALIDATION",
      `Update would exceed sanctioned ${formatInrFromPaise(facility.sanctionedAmount)}.`,
    );
  }
  if (balances.available < 0) {
    throw new AppError(
      "VALIDATION",
      "Update would make the loan wallet available balance negative.",
    );
  }
  if (balances.openRotational < 0) {
    throw new AppError(
      "VALIDATION",
      "Update would over-repay rotational diversions.",
    );
  }

  if (existing.type === "CREDIT_REPAYMENT" && existing.linkedDebitId) {
    const debit = rows.find((row) => row.id === existing.linkedDebitId);
    if (!debit) {
      throw new AppError("VALIDATION", "Linked diversion was not found.");
    }
    const repaidOthers = repaidOnDebitPaise(debit.id, others);
    if (repaidOthers + amount > debit.amount) {
      throw new AppError(
        "VALIDATION",
        `Repayment cannot exceed the diversion of ${formatInrFromPaise(debit.amount)}.`,
      );
    }
  }

  if (existing.type === "DEBIT_OTHER") {
    const repaid = repaidOnDebitPaise(existing.id, asTxnRows(rows));
    if (amount < repaid) {
      throw new AppError(
        "VALIDATION",
        `Amount cannot be below already repaid ${formatInrFromPaise(repaid)}.`,
      );
    }
  }

  const updated = await loanDb.loanTransaction.update({
    where: { id: existing.id },
    data: {
      amount,
      transactionDate,
      paidTo: parsed.data.paidTo?.trim() || null,
      paymentMethod: paymentMethodOrNull(parsed.data.paymentMethod),
      referenceNumber: parsed.data.referenceNumber?.trim() || null,
      description: parsed.data.description?.trim() || null,
      notes: parsed.data.notes?.trim() || null,
      visibility: parsed.data.visibility,
    },
  });

  await recordAuditEvent({
    projectId: ctx.project.id,
    actorId: ctx.user.id,
    action: "UPDATE",
    entityType: "LoanTransaction",
    entityId: updated.id,
    metadata: { amount, loanNumber: updated.loanNumber },
    activity: {
      message: `${actorLabel(ctx.user)} updated loan ${updated.loanNumber}.`,
      href: `/p/${slug}/loans/${updated.id}`,
    },
  });

  return updated;
}

export async function softDeleteLoanTransaction(
  slug: string,
  transactionId: string,
  input: unknown,
) {
  const ctx = await requireProjectPermissionBySlug(slug, "LOAN_DELETE");
  const parsed = softDeleteLoanTransactionSchema.safeParse(input);
  if (!parsed.success) {
    throw new AppError("VALIDATION", "Invalid delete request.");
  }

  const facility = await loadFacilityOrThrow(ctx.project.id);
  const existing = await loanDb.loanTransaction.findFirst({
    where: {
      id: transactionId,
      projectId: ctx.project.id,
      facilityId: facility.id,
      ...notDeleted,
    },
  });
  if (!existing) {
    throw new AppError("NOT_FOUND", "Loan transaction was not found.");
  }

  if (existing.type === "DEBIT_OTHER") {
    const repayments = await loanDb.loanTransaction.count({
      where: {
        linkedDebitId: existing.id,
        type: "CREDIT_REPAYMENT",
        ...notDeleted,
      },
    });
    if (repayments > 0) {
      throw new AppError(
        "CONFLICT",
        "Delete repayments on this diversion before deleting it.",
      );
    }
  }

  const rows = await loadActiveTxnRows(facility.id);
  const remaining = asTxnRows(rows).filter((row) => row.id !== existing.id);
  const balances = computeLoanBalances(facility.sanctionedAmount, remaining);
  if (balances.available < 0 || balances.openRotational < 0) {
    throw new AppError(
      "CONFLICT",
      "Deleting this row would break loan wallet balances.",
    );
  }

  await loanDb.loanTransaction.update({
    where: { id: existing.id },
    data: {
      deletedAt: new Date(),
      deletedById: ctx.user.id,
      deletionReason: parsed.data.deletionReason?.trim() || null,
    },
  });

  await recordAuditEvent({
    projectId: ctx.project.id,
    actorId: ctx.user.id,
    action: "DELETE",
    entityType: "LoanTransaction",
    entityId: existing.id,
    metadata: { loanNumber: existing.loanNumber },
    activity: {
      message: `${actorLabel(ctx.user)} deleted loan ${existing.loanNumber}.`,
      href: `/p/${slug}/loans`,
    },
  });
}

function typeLabel(type: string): string {
  switch (type) {
    case "DISBURSEMENT":
      return "disbursement";
    case "DEBIT_CONSTRUCTION":
      return "construction debit";
    case "DEBIT_OTHER":
      return "rotational debit";
    case "CREDIT_REPAYMENT":
      return "repayment";
    default:
      return "transaction";
  }
}
