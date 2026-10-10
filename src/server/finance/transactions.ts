import type {
  PaymentMethod,
  TransactionStatus,
  Visibility,
} from "@prisma/client";

import { AppError } from "@/lib/errors";
import {
  computeAdvanceOutstanding,
  deriveAdvanceStatus,
} from "@/server/advances/outstanding";
import { derivePaymentRequestStatus } from "@/server/payments/invariants";
import { logger } from "@/lib/logger";
import { formatInrFromPaise, paiseFromRupeeString } from "@/lib/money";
import { actorLabel, recordAuditEvent } from "@/server/audit/record";
import {
  assertCanViewProjectResource,
  canViewResource,
  includeInSharedProjectTotals,
  requireProjectPermissionBySlug,
  type VisibleResource,
} from "@/server/authorization";
import { prisma } from "@/server/db/prisma";
import { notDeleted } from "@/server/db/soft-delete";
import {
  createTransactionSchema,
  softDeleteTransactionSchema,
  updateTransactionSchema,
} from "@/validators/finance";

import { resolveContractSplit } from "./contract-split";
import { allocateTransactionNumber } from "./numbering";
import {
  linkTransactionProofDocuments,
  resolvePaymentProofDocumentIds,
} from "./payment-proof";
import { defaultDirectionForType, sumAuthorizedFinanceTotals } from "./totals";

function toVisibleResource(tx: {
  projectId: string;
  visibility: Visibility;
  createdById: string;
  allowedUserIds: string[];
  deletedAt: Date | null;
}): VisibleResource {
  return {
    projectId: tx.projectId,
    visibility: tx.visibility,
    createdById: tx.createdById,
    allowedUserIds: tx.allowedUserIds,
    deletedAt: tx.deletedAt,
  };
}

const listSelect = {
  id: true,
  projectId: true,
  transactionNumber: true,
  type: true,
  direction: true,
  amount: true,
  currency: true,
  categoryId: true,
  accountId: true,
  paidTo: true,
  transactionDate: true,
  status: true,
  paymentMethod: true,
  referenceNumber: true,
  description: true,
  visibility: true,
  allowedUserIds: true,
  createdById: true,
  createdAt: true,
  deletedAt: true,
  includeInContract: true,
  outOfContractAmount: true,
  category: { select: { id: true, name: true, code: true } },
  account: { select: { id: true, name: true } },
} as const;

export async function listTransactions(slug: string) {
  const ctx = await requireProjectPermissionBySlug(slug, "FINANCE_VIEW");

  const rows = await prisma.financialTransaction.findMany({
    where: {
      projectId: ctx.project.id,
      ...notDeleted,
    },
    orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }],
    take: 200,
    select: listSelect,
  });

  const authorized = rows.filter((row) =>
    canViewResource(
      { userId: ctx.user.id, role: ctx.role },
      toVisibleResource(row),
      ctx.project.id,
    ),
  );

  const sharedRows = authorized.filter((row) =>
    includeInSharedProjectTotals(toVisibleResource(row)),
  );

  // Viewer list includes own private rows; sharedTotals exclude PRIVATE for collaborator-safe cards.
  const totals = sumAuthorizedFinanceTotals(authorized);
  const sharedTotals = sumAuthorizedFinanceTotals(sharedRows);

  return {
    project: ctx.project,
    role: ctx.role,
    transactions: authorized,
    totals,
    sharedTotals,
  };
}

export async function getTransaction(slug: string, transactionId: string) {
  const ctx = await requireProjectPermissionBySlug(slug, "FINANCE_VIEW");

  const tx = await prisma.financialTransaction.findFirst({
    where: { id: transactionId, projectId: ctx.project.id },
    include: {
      category: true,
      account: true,
      proofDocument: {
        select: {
          id: true,
          title: true,
          documentNumber: true,
          fileName: true,
          mimeType: true,
        },
      },
      createdBy: { select: { id: true, name: true, email: true } },
      paidBy: { select: { id: true, name: true, email: true } },
      advanceFunding: { select: { id: true } },
      advanceSettlement: { select: { id: true } },
      paymentRequests: { select: { id: true }, take: 1 },
    },
  });

  if (!tx) {
    throw new AppError("NOT_FOUND", "Transaction was not found.");
  }

  await assertCanViewProjectResource(
    ctx.project.id,
    ctx.user.id,
    toVisibleResource(tx),
  );

  // Extended Prisma client typings can lag behind schema for new scalars;
  // read proofDocumentIds through an explicit shape check.
  const extraProofIds = readProofDocumentIds(tx);

  const proofIds = Array.from(
    new Set(
      [tx.proofDocumentId, ...extraProofIds].filter(
        (id): id is string => Boolean(id),
      ),
    ),
  );

  const proofDocuments =
    proofIds.length === 0
      ? []
      : await prisma.document.findMany({
          where: {
            id: { in: proofIds },
            projectId: ctx.project.id,
          },
          select: {
            id: true,
            title: true,
            documentNumber: true,
            fileName: true,
            mimeType: true,
            createdAt: true,
          },
          orderBy: { createdAt: "asc" },
        });

  // Preserve upload order from proofDocumentIds / primary id.
  const byId = new Map(proofDocuments.map((doc) => [doc.id, doc]));
  const orderedProofs = proofIds
    .map((id) => byId.get(id))
    .filter((doc): doc is (typeof proofDocuments)[number] => Boolean(doc));

  return {
    project: ctx.project,
    role: ctx.role,
    transaction: {
      ...tx,
      proofDocument: orderedProofs[0] ?? tx.proofDocument,
      proofDocuments: orderedProofs,
    },
  };
}

function readProofDocumentIds(row: unknown): string[] {
  if (!row || typeof row !== "object") return [];
  const value = (row as { proofDocumentIds?: unknown }).proofDocumentIds;
  if (!Array.isArray(value)) return [];
  return value.filter((id): id is string => typeof id === "string" && id.length > 0);
}

export async function createTransaction(slug: string, input: unknown) {
  const ctx = await requireProjectPermissionBySlug(slug, "FINANCE_CREATE");
  const parsed = createTransactionSchema.safeParse(input);
  if (!parsed.success) {
    const proofIssue = parsed.error.issues.find(
      (issue) =>
        issue.path[0] === "cloudinaryPublicId" ||
        issue.path[0] === "paymentProofsJson",
    );
    const contractIssue = parsed.error.issues.find(
      (issue) =>
        issue.path[0] === "contractIncludedRupees" ||
        issue.path[0] === "contractScope",
    );
    throw new AppError(
      "VALIDATION",
      proofIssue?.message ||
        contractIssue?.message ||
        "Please check the transaction details.",
    );
  }

  let amount: number;
  try {
    amount = paiseFromRupeeString(parsed.data.amountRupees);
  } catch {
    throw new AppError("VALIDATION", "Invalid amount.");
  }
  if (amount <= 0) {
    throw new AppError("VALIDATION", "Amount must be greater than zero.");
  }
  const contractSplit = resolveContractSplit({
    amountPaise: amount,
    contractScope: parsed.data.contractScope,
    contractIncludedRupees: parsed.data.contractIncludedRupees,
  });

  if (parsed.data.status === "PAID" && !parsed.data.transactionDate) {
    throw new AppError(
      "VALIDATION",
      "Paid transactions require a payment date.",
    );
  }

  const transactionDate = new Date(parsed.data.transactionDate);
  if (Number.isNaN(transactionDate.getTime())) {
    throw new AppError("VALIDATION", "Invalid transaction date.");
  }

  if (parsed.data.categoryId) {
    const category = await prisma.category.findFirst({
      where: {
        id: parsed.data.categoryId,
        OR: [
          { isSystem: true, projectId: null },
          { projectId: ctx.project.id },
        ],
      },
    });
    if (!category) {
      throw new AppError("VALIDATION", "Invalid category.");
    }
  }

  if (parsed.data.accountId) {
    const account = await prisma.financialAccount.findFirst({
      where: {
        id: parsed.data.accountId,
        projectId: ctx.project.id,
        status: "ACTIVE",
      },
    });
    if (!account) {
      throw new AppError("VALIDATION", "Invalid account.");
    }
  }

  const transactionNumber = await allocateTransactionNumber({
    projectId: ctx.project.id,
    projectSlug: ctx.project.slug,
    type: parsed.data.type,
  });

  const direction = defaultDirectionForType(parsed.data.type);

  const proofDocumentIds = await resolvePaymentProofDocumentIds({
    actor: {
      projectId: ctx.project.id,
      projectSlug: ctx.project.slug,
      userId: ctx.user.id,
      userName: ctx.user.name,
      userEmail: ctx.user.email,
    },
    paymentMethod: parsed.data.paymentMethod,
    proof: parsed.data,
    visibility: parsed.data.visibility as Visibility,
    title: `Payment proof · ${parsed.data.paidTo || parsed.data.type}`,
    description:
      parsed.data.referenceNumber
        ? `Ref: ${parsed.data.referenceNumber}`
        : parsed.data.description || null,
  });

  const tx = await prisma.financialTransaction.create({
    data: {
      projectId: ctx.project.id,
      transactionNumber,
      type: parsed.data.type,
      direction,
      amount,
      currency: ctx.project.currency || "INR",
      categoryId: parsed.data.categoryId || null,
      accountId: parsed.data.accountId || null,
      paidByUserId: ctx.user.id,
      paidTo: parsed.data.paidTo || null,
      transactionDate,
      status: parsed.data.status as TransactionStatus,
      paymentMethod:
        (parsed.data.paymentMethod as PaymentMethod | undefined) ?? null,
      referenceNumber: parsed.data.referenceNumber || null,
      description: parsed.data.description || null,
      notes: parsed.data.notes || null,
      includeInContract: contractSplit.includeInContract,
      outOfContractAmount: contractSplit.outOfContractAmount,
      visibility: parsed.data.visibility as Visibility,
      allowedUserIds: [],
      createdById: ctx.user.id,
      approvedById:
        parsed.data.status === "PAID" || parsed.data.status === "APPROVED"
          ? ctx.user.id
          : null,
      approvedAt:
        parsed.data.status === "PAID" || parsed.data.status === "APPROVED"
          ? new Date()
          : null,
    },
    // Extended Prisma client input types omit newer scalars until the
    // language service reloads the generated client.
  } as Parameters<typeof prisma.financialTransaction.create>[0]);

  if (proofDocumentIds.length > 0) {
    await linkTransactionProofDocuments(tx.id, proofDocumentIds);
  }

  logger.info("Transaction created", {
    projectId: ctx.project.id,
    transactionId: tx.id,
    actorId: ctx.user.id,
    type: tx.type,
    visibility: tx.visibility,
  });

  await recordAuditEvent({
    projectId: ctx.project.id,
    actorId: ctx.user.id,
    action: "CREATE",
    entityType: "FinancialTransaction",
    entityId: tx.id,
    metadata: {
      type: tx.type,
      amount: tx.amount,
      status: tx.status,
      visibility: tx.visibility,
      transactionNumber: tx.transactionNumber,
    },
    activity: {
      message: `${actorLabel(ctx.user)} recorded ${formatInrFromPaise(tx.amount)} (${tx.transactionNumber}).`,
      href: `/p/${slug}/finance/${tx.id}`,
      visibility: tx.visibility,
    },
  });

  return tx;
}

export async function updateTransaction(
  slug: string,
  transactionId: string,
  input: unknown,
) {
  const ctx = await requireProjectPermissionBySlug(slug, "FINANCE_EDIT");
  const parsed = updateTransactionSchema.safeParse(input);
  if (!parsed.success) {
    const contractIssue = parsed.error.issues.find(
      (issue) =>
        issue.path[0] === "contractIncludedRupees" ||
        issue.path[0] === "contractScope",
    );
    throw new AppError(
      "VALIDATION",
      contractIssue?.message || "Please check the transaction details.",
    );
  }

  const existing = await prisma.financialTransaction.findFirst({
    where: { id: transactionId, projectId: ctx.project.id, ...notDeleted },
    include: {
      advanceFunding: {
        include: {
          settlements: {
            select: { id: true, kind: true, amount: true, deletedAt: true },
          },
        },
      },
      advanceSettlement: {
        include: {
          advance: {
            include: {
              settlements: {
                select: { id: true, kind: true, amount: true, deletedAt: true },
              },
            },
          },
        },
      },
      paymentRequests: {
        select: {
          id: true,
          amount: true,
          paidAmount: true,
          linkedTransactionId: true,
          status: true,
        },
      },
    },
  });
  if (!existing) {
    throw new AppError("NOT_FOUND", "Transaction was not found.");
  }
  await assertCanViewProjectResource(
    ctx.project.id,
    ctx.user.id,
    toVisibleResource(existing),
  );

  let amount: number;
  try {
    amount = paiseFromRupeeString(parsed.data.amountRupees);
  } catch {
    throw new AppError("VALIDATION", "Invalid amount.");
  }
  if (amount <= 0) {
    throw new AppError("VALIDATION", "Amount must be greater than zero.");
  }
  const contractSplit = resolveContractSplit({
    amountPaise: amount,
    contractScope: parsed.data.contractScope,
    contractIncludedRupees: parsed.data.contractIncludedRupees,
  });
  const transactionDate = new Date(parsed.data.transactionDate);
  if (Number.isNaN(transactionDate.getTime())) {
    throw new AppError("VALIDATION", "Invalid transaction date.");
  }

  const linkedRequests = existing.paymentRequests.filter(
    (request) => request.linkedTransactionId === existing.id,
  );
  for (const request of linkedRequests) {
    const paidAmount = request.paidAmount + (amount - existing.amount);
    if (
      request.status === "PAID" ||
      request.status === "PARTIALLY_PAID"
    ) {
      if (paidAmount <= 0 || paidAmount > request.amount) {
        throw new AppError(
          "VALIDATION",
          "This payment is linked to a request. The new amount cannot exceed what was requested or drop the paid total to zero.",
        );
      }
    }
  }

  if (existing.advanceFunding) {
    try {
      computeAdvanceOutstanding(amount, existing.advanceFunding.settlements);
    } catch {
      throw new AppError(
        "VALIDATION",
        "This amount is smaller than what has already been settled on the advance.",
      );
    }
  }

  if (existing.advanceSettlement?.advance) {
    const settlementId = existing.advanceSettlement.id;
    const settlements = existing.advanceSettlement.advance.settlements.map(
      (row) =>
        row.id === settlementId ? { ...row, amount } : row,
    );
    try {
      computeAdvanceOutstanding(
        existing.advanceSettlement.advance.originalAmount,
        settlements,
      );
    } catch {
      throw new AppError(
        "VALIDATION",
        "This settlement amount is larger than the advance still outstanding.",
      );
    }
  }

  const direction = defaultDirectionForType(parsed.data.type);
  const updated = await prisma.financialTransaction.update({
    where: { id: existing.id },
    data: {
      type: parsed.data.type,
      direction,
      amount,
      categoryId: parsed.data.categoryId || null,
      accountId: parsed.data.accountId || null,
      paidTo: parsed.data.paidTo || null,
      transactionDate,
      status: parsed.data.status,
      paymentMethod:
        (parsed.data.paymentMethod as PaymentMethod | undefined) ?? null,
      referenceNumber: parsed.data.referenceNumber || null,
      description: parsed.data.description || null,
      notes: parsed.data.notes || null,
      includeInContract: contractSplit.includeInContract,
      outOfContractAmount: contractSplit.outOfContractAmount,
      visibility: parsed.data.visibility as Visibility,
    },
  } as Parameters<typeof prisma.financialTransaction.update>[0]);

  if (existing.advanceFunding) {
    const breakdown = computeAdvanceOutstanding(
      amount,
      existing.advanceFunding.settlements,
    );
    await prisma.advance.update({
      where: { id: existing.advanceFunding.id },
      data: {
        originalAmount: amount,
        recipientName: parsed.data.paidTo || null,
        categoryId: parsed.data.categoryId || null,
        accountId: parsed.data.accountId || null,
        issuedAt: transactionDate,
        description: parsed.data.description || null,
        notes: parsed.data.notes || null,
        visibility: parsed.data.visibility as Visibility,
        status: deriveAdvanceStatus({
          originalAmount: amount,
          outstanding: breakdown.outstanding,
          cancelled: existing.advanceFunding.status === "CANCELLED",
        }),
      },
    });
  }

  if (existing.advanceSettlement?.advance) {
    await prisma.advanceSettlement.update({
      where: { id: existing.advanceSettlement.id },
      data: {
        amount,
        settledAt: transactionDate,
        description: parsed.data.description || null,
        notes: parsed.data.notes || null,
      },
    });
    const settlementId = existing.advanceSettlement.id;
    const settlements = existing.advanceSettlement.advance.settlements.map(
      (row) => (row.id === settlementId ? { ...row, amount } : row),
    );
    const breakdown = computeAdvanceOutstanding(
      existing.advanceSettlement.advance.originalAmount,
      settlements,
    );
    await prisma.advance.update({
      where: { id: existing.advanceSettlement.advance.id },
      data: {
        status: deriveAdvanceStatus({
          originalAmount: existing.advanceSettlement.advance.originalAmount,
          outstanding: breakdown.outstanding,
          cancelled: existing.advanceSettlement.advance.status === "CANCELLED",
        }),
      },
    });
  }

  for (const request of linkedRequests) {
    const paidAmount = request.paidAmount + (amount - existing.amount);
    if (request.status !== "PAID" && request.status !== "PARTIALLY_PAID") {
      continue;
    }
    await prisma.paymentRequest.update({
      where: { id: request.id },
      data: {
        paidAmount,
        categoryId: parsed.data.categoryId || null,
        accountId: parsed.data.accountId || null,
        payeeName: parsed.data.paidTo || null,
        status: derivePaymentRequestStatus({
          requestedAmount: request.amount,
          paidAmount,
          hasLinkedTransaction: true,
        }),
        paidAt: transactionDate,
      },
    });
  }

  await recordAuditEvent({
    projectId: ctx.project.id,
    actorId: ctx.user.id,
    action: "UPDATE",
    entityType: "FinancialTransaction",
    entityId: updated.id,
    metadata: {
      transactionNumber: updated.transactionNumber,
      amount: updated.amount,
      previousAmount: existing.amount,
      includeInContract: contractSplit.includeInContract,
      outOfContractAmount: contractSplit.outOfContractAmount,
    },
    activity: {
      message: `${actorLabel(ctx.user)} updated ${updated.transactionNumber}.`,
      href: `/p/${slug}/finance/${updated.id}`,
      visibility: updated.visibility,
    },
  });

  return updated;
}

export async function softDeleteTransaction(
  slug: string,
  transactionId: string,
  input: unknown,
) {
  const ctx = await requireProjectPermissionBySlug(slug, "FINANCE_DELETE");
  const parsed = softDeleteTransactionSchema.safeParse(input);
  if (!parsed.success) {
    throw new AppError("VALIDATION", "Deletion reason is required.");
  }

  const tx = await prisma.financialTransaction.findFirst({
    where: { id: transactionId, projectId: ctx.project.id, ...notDeleted },
  });
  if (!tx) {
    throw new AppError("NOT_FOUND", "Transaction was not found.");
  }

  const updated = await prisma.financialTransaction.update({
    where: { id: tx.id },
    data: {
      deletedAt: new Date(),
      deletedById: ctx.user.id,
      deletionReason: parsed.data.reason,
    },
  });

  logger.info("Transaction soft-deleted", {
    projectId: ctx.project.id,
    transactionId: tx.id,
    actorId: ctx.user.id,
  });

  await recordAuditEvent({
    projectId: ctx.project.id,
    actorId: ctx.user.id,
    action: "DELETE",
    entityType: "FinancialTransaction",
    entityId: tx.id,
    metadata: {
      reason: parsed.data.reason,
      transactionNumber: tx.transactionNumber,
      amount: tx.amount,
    },
    activity: {
      message: `${actorLabel(ctx.user)} soft-deleted ${tx.transactionNumber}.`,
      href: `/p/${slug}/finance/${tx.id}`,
      visibility: tx.visibility,
    },
  });

  return updated;
}
