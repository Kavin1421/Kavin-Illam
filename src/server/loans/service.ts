import type { PaymentMethod, Visibility } from "@prisma/client";

import { formatDateInput } from "@/lib/dates";
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
import { resolvePaymentProofDocumentIds } from "@/server/finance/payment-proof";
import {
  computeLoanBalances,
  outstandingOnDebitPaise,
  repaidOnDebitPaise,
  rotationalStatusForDebit,
  type LoanTxnRow,
  type RotationalStatus,
} from "@/server/loans/math";
import { notifyOpenLoanDiversions } from "@/server/loans/notify";
import {
  loanTxnListInclude,
  type LoanFacility,
  type LoanLedgerRow,
  type LoanProofDocument,
  type LoanTxnDetail,
  type LoanTxnListItem,
} from "@/server/loans/types";
import {
  createLoanFacilitySchema,
  createLoanTransactionSchema,
  MAX_LOAN_PAYMENT_PROOFS,
  OPEN_DIVERSION_REMINDER_DAYS,
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
    findMany: (args?: object) => Promise<LoanFacility[]>;
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

function readProofDocumentIds(row: unknown): string[] {
  if (!row || typeof row !== "object") return [];
  const value = (row as { proofDocumentIds?: unknown }).proofDocumentIds;
  if (!Array.isArray(value)) return [];
  return value.filter(
    (id): id is string => typeof id === "string" && id.length > 0,
  );
}

async function loadOrderedProofDocuments(
  projectId: string,
  row: { proofDocumentId?: string | null },
): Promise<LoanProofDocument[]> {
  const proofIds = Array.from(
    new Set(
      [row.proofDocumentId, ...readProofDocumentIds(row)].filter(
        (id): id is string => Boolean(id),
      ),
    ),
  );
  if (proofIds.length === 0) return [];

  const docs = await prisma.document.findMany({
    where: { id: { in: proofIds }, projectId },
    select: {
      id: true,
      title: true,
      documentNumber: true,
      fileName: true,
      mimeType: true,
    },
  });
  const byId = new Map(docs.map((doc) => [doc.id, doc]));
  return proofIds
    .map((id) => byId.get(id))
    .filter((doc): doc is (typeof docs)[number] => Boolean(doc))
    .map(
      (doc): LoanProofDocument => ({
        id: doc.id,
        title: doc.title,
        documentNumber: doc.documentNumber,
        fileName: doc.fileName,
        mimeType: doc.mimeType ?? null,
      }),
    );
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

/** Whole calendar days open in Asia/Kolkata. */
export function calendarDaysOpen(
  transactionDate: Date,
  now: Date = new Date(),
): number {
  const start = formatDateInput(transactionDate);
  const end = formatDateInput(now);
  const a = Date.parse(`${start}T00:00:00+05:30`);
  const b = Date.parse(`${end}T00:00:00+05:30`);
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.max(0, Math.floor((b - a) / 86_400_000));
}

export type OpenDiversionAlert = LoanLedgerRow & {
  daysOpen: number;
  overdue: boolean;
};

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
    const emptyTxns: LoanLedgerRow[] = [];
    const emptyOpen: OpenDiversionAlert[] = [];
    return {
      project: ctx.project,
      role: ctx.role,
      facility: null,
      balances: null,
      transactions: emptyTxns,
      openDiversions: emptyOpen,
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

  const openDiversions: OpenDiversionAlert[] = transactions
    .filter(
      (row: LoanLedgerRow) =>
        row.type === "DEBIT_OTHER" &&
        row.rotationalStatus !== "REPAID" &&
        row.outstanding > 0,
    )
    .map((row) => {
      const daysOpen = calendarDaysOpen(row.transactionDate);
      return {
        ...row,
        daysOpen,
        overdue: daysOpen >= OPEN_DIVERSION_REMINDER_DAYS,
      };
    });

  return {
    project: ctx.project,
    role: ctx.role,
    facility,
    balances,
    transactions,
    openDiversions,
  };
}

export async function sendOpenDiversionReminders(slug: string) {
  const ctx = await requireProjectPermissionBySlug(slug, "LOAN_VIEW");
  const overview = await getLoanOverview(slug);
  const overdue = overview.openDiversions.filter((row) => row.overdue);
  if (overdue.length === 0) {
    return {
      emailed: 0,
      overdueCount: 0,
      message: `No diversions open for ${OPEN_DIVERSION_REMINDER_DAYS}+ days.`,
    };
  }

  const result = await notifyOpenLoanDiversions({
    projectId: ctx.project.id,
    projectSlug: ctx.project.slug,
    projectName: ctx.project.name,
    items: overdue.map((row) => ({
      loanNumber: row.loanNumber,
      outstanding: row.outstanding,
      daysOpen: row.daysOpen,
      label: row.description || row.paidTo || "Rotational diversion",
    })),
  });

  await recordAuditEvent({
    projectId: ctx.project.id,
    actorId: ctx.user.id,
    action: "EXPORT",
    entityType: "LoanFacility",
    entityId: overview.facility?.id ?? ctx.project.id,
    metadata: {
      overdueCount: overdue.length,
      emailed: result.emailed,
      kind: "open_diversion_reminder",
    },
    activity: {
      message: `${actorLabel(ctx.user)} sent open-diversion reminders (${overdue.length}).`,
      href: `/p/${slug}/loans?filter=open`,
    },
  });

  return {
    emailed: result.emailed,
    overdueCount: overdue.length,
    message:
      result.emailed > 0
        ? `Reminder emailed to ${result.emailed} recipient${result.emailed === 1 ? "" : "s"}.`
        : "No email recipients found for this project.",
  };
}

/**
 * Cron entry: email reminders for every project with overdue open diversions.
 */
export async function runOpenDiversionReminderCron(): Promise<{
  projectsChecked: number;
  projectsNotified: number;
  emailsQueued: number;
}> {
  const facilities = await loanDb.loanFacility.findMany({
    where: { ...notDeleted, status: "ACTIVE" },
  });

  const projects = await prisma.project.findMany({
    where: {
      id: { in: facilities.map((row) => row.projectId) },
    },
    select: { id: true, slug: true, name: true },
  });
  const projectById = new Map(projects.map((row) => [row.id, row]));

  let projectsChecked = 0;
  let projectsNotified = 0;
  let emailsQueued = 0;

  for (const facility of facilities) {
    const project = projectById.get(facility.projectId);
    if (!project) continue;
    projectsChecked += 1;

    const openDebits = await loanDb.loanTransaction.findMany({
      where: {
        facilityId: facility.id,
        type: "DEBIT_OTHER",
        ...notDeleted,
      },
    });
    const allRows = await loadActiveTxnRows(facility.id);
    const allTxnRows = asTxnRows(allRows);

    const overdue = openDebits
      .filter((row) => row.type === "DEBIT_OTHER")
      .map((row) => {
        const outstanding = outstandingOnDebitPaise(
          toLoanTxnRow(row),
          allTxnRows,
        );
        const daysOpen = calendarDaysOpen(row.transactionDate);
        return {
          loanNumber: row.loanNumber,
          outstanding,
          daysOpen,
          label: row.description || row.paidTo || "Rotational diversion",
          overdue:
            outstanding > 0 && daysOpen >= OPEN_DIVERSION_REMINDER_DAYS,
        };
      })
      .filter((row) => row.overdue);

    if (overdue.length === 0) continue;

    const result = await notifyOpenLoanDiversions({
      projectId: project.id,
      projectSlug: project.slug,
      projectName: project.name,
      items: overdue,
    });
    if (result.emailed > 0) {
      projectsNotified += 1;
      emailsQueued += result.emailed;
    }
  }

  return { projectsChecked, projectsNotified, emailsQueued };
}

/**
 * Soft-link a construction debit to a Finance expense (audit pointer only).
 */
export async function linkLoanTransactionToFinance(params: {
  projectId: string;
  loanTransactionId: string;
  financeTransactionId: string;
}): Promise<void> {
  const loan = await loanDb.loanTransaction.findFirst({
    where: {
      id: params.loanTransactionId,
      projectId: params.projectId,
      ...notDeleted,
    },
  });
  if (!loan) {
    throw new AppError("NOT_FOUND", "Loan transaction was not found.");
  }
  if (loan.type !== "DEBIT_CONSTRUCTION") {
    throw new AppError(
      "VALIDATION",
      "Only construction debits can link to Finance.",
    );
  }
  if (loan.linkedFinanceTransactionId) {
    throw new AppError(
      "CONFLICT",
      "This diversion is already linked to a Finance transaction.",
    );
  }

  await loanDb.loanTransaction.update({
    where: { id: loan.id },
    data: { linkedFinanceTransactionId: params.financeTransactionId },
  });
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

  const proofDocuments = await loadOrderedProofDocuments(ctx.project.id, txn);

  return {
    project: ctx.project,
    role: ctx.role,
    facility,
    balances,
    transaction: {
      ...txn,
      proofDocument: proofDocuments[0] ?? txn.proofDocument,
      proofDocuments,
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

  const paymentMethod = paymentMethodOrNull(parsed.data.paymentMethod);
  const loanNumber = await allocateLoanNumber({
    projectId: ctx.project.id,
    projectSlug: ctx.project.slug,
  });

  const proofDocumentIds = await resolvePaymentProofDocumentIds({
    actor: {
      projectId: ctx.project.id,
      projectSlug: ctx.project.slug,
      userId: ctx.user.id,
      userName: ctx.user.name,
      userEmail: ctx.user.email,
    },
    paymentMethod,
    proof: parsed.data,
    visibility: parsed.data.visibility,
    title: `Loan payment proof · ${loanNumber}`,
    description: parsed.data.description?.trim() || null,
    maxProofs: MAX_LOAN_PAYMENT_PROOFS,
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
      paymentMethod,
      referenceNumber: parsed.data.referenceNumber?.trim() || null,
      description: parsed.data.description?.trim() || null,
      notes: parsed.data.notes?.trim() || null,
      linkedDebitId,
      visibility: parsed.data.visibility,
      allowedUserIds: [],
      createdById: ctx.user.id,
      proofDocumentId: proofDocumentIds[0] ?? null,
      proofDocumentIds,
    },
  });

  await recordAuditEvent({
    projectId: ctx.project.id,
    actorId: ctx.user.id,
    action: "CREATE",
    entityType: "LoanTransaction",
    entityId: txn.id,
    metadata: {
      type,
      amount,
      loanNumber,
      proofCount: proofDocumentIds.length,
    },
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

  const existingProofIds = Array.from(
    new Set(
      [existing.proofDocumentId, ...readProofDocumentIds(existing)].filter(
        (id): id is string => Boolean(id),
      ),
    ),
  );
  const remainingProofSlots = Math.max(
    0,
    MAX_LOAN_PAYMENT_PROOFS - existingProofIds.length,
  );
  const paymentMethod = paymentMethodOrNull(parsed.data.paymentMethod);
  const newProofIds =
    remainingProofSlots > 0
      ? await resolvePaymentProofDocumentIds({
          actor: {
            projectId: ctx.project.id,
            projectSlug: ctx.project.slug,
            userId: ctx.user.id,
            userName: ctx.user.name,
            userEmail: ctx.user.email,
          },
          paymentMethod,
          proof: parsed.data,
          visibility: parsed.data.visibility,
          title: `Loan payment proof · ${existing.loanNumber}`,
          description: parsed.data.description?.trim() || null,
          maxProofs: remainingProofSlots,
          optional: true,
        })
      : [];
  const proofDocumentIds = [...existingProofIds, ...newProofIds].slice(
    0,
    MAX_LOAN_PAYMENT_PROOFS,
  );

  const updated = await loanDb.loanTransaction.update({
    where: { id: existing.id },
    data: {
      amount,
      transactionDate,
      paidTo: parsed.data.paidTo?.trim() || null,
      paymentMethod,
      referenceNumber: parsed.data.referenceNumber?.trim() || null,
      description: parsed.data.description?.trim() || null,
      notes: parsed.data.notes?.trim() || null,
      visibility: parsed.data.visibility,
      proofDocumentId: proofDocumentIds[0] ?? null,
      proofDocumentIds,
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
