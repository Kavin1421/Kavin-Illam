import type {
  PaymentMethod,
  TransactionStatus,
  Visibility,
} from "@prisma/client";

import { AppError } from "@/lib/errors";
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
} from "@/validators/finance";

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

  const proofIds = Array.from(
    new Set(
      [tx.proofDocumentId, ...(tx.proofDocumentIds ?? [])].filter(
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

export async function createTransaction(slug: string, input: unknown) {
  const ctx = await requireProjectPermissionBySlug(slug, "FINANCE_CREATE");
  const parsed = createTransactionSchema.safeParse(input);
  if (!parsed.success) {
    const proofIssue = parsed.error.issues.find(
      (issue) =>
        issue.path[0] === "cloudinaryPublicId" ||
        issue.path[0] === "paymentProofsJson",
    );
    throw new AppError(
      "VALIDATION",
      proofIssue?.message || "Please check the transaction details.",
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
  });

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
