import type {
  AdvanceSettlementKind,
  PaymentMethod,
  Visibility,
} from "@prisma/client";

import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { formatInrFromPaise, paiseFromRupeeString } from "@/lib/money";
import { actorLabel, recordAuditEvent } from "@/server/audit/record";
import {
  assertCanViewProjectResource,
  canViewResource,
  requireProjectPermissionBySlug,
  type VisibleResource,
} from "@/server/authorization";
import { prisma } from "@/server/db/prisma";
import { notDeleted } from "@/server/db/soft-delete";
import {
  allocateAdvanceNumber,
  allocateTransactionNumber,
} from "@/server/finance/numbering";
import { defaultDirectionForType } from "@/server/finance/totals";
import {
  createAdvanceSchema,
  settleAdvanceSchema,
  softDeleteAdvanceSchema,
} from "@/validators/advances";

import {
  assertSettlementWithinOutstanding,
  computeAdvanceOutstanding,
  deriveAdvanceStatus,
} from "./outstanding";

function toVisibleResource(row: {
  projectId: string;
  visibility: Visibility;
  createdById: string;
  allowedUserIds: string[];
  deletedAt: Date | null;
}): VisibleResource {
  return {
    projectId: row.projectId,
    visibility: row.visibility,
    createdById: row.createdById,
    allowedUserIds: row.allowedUserIds,
    deletedAt: row.deletedAt,
  };
}

async function validateCategory(projectId: string, categoryId?: string) {
  if (!categoryId) return;
  const category = await prisma.category.findFirst({
    where: {
      id: categoryId,
      OR: [{ isSystem: true, projectId: null }, { projectId }],
    },
  });
  if (!category) {
    throw new AppError("VALIDATION", "Invalid category.");
  }
}

async function validateAccount(projectId: string, accountId?: string) {
  if (!accountId) return;
  const account = await prisma.financialAccount.findFirst({
    where: { id: accountId, projectId, status: "ACTIVE" },
  });
  if (!account) {
    throw new AppError("VALIDATION", "Invalid account.");
  }
}

function withOutstanding<
  T extends {
    originalAmount: number;
    status: string;
    deletedAt: Date | null;
    settlements: {
      kind: AdvanceSettlementKind;
      amount: number;
      deletedAt: Date | null;
    }[];
  },
>(advance: T) {
  const breakdown = computeAdvanceOutstanding(
    advance.originalAmount,
    advance.settlements,
  );
  return {
    ...advance,
    ...breakdown,
    status:
      advance.deletedAt || advance.status === "CANCELLED"
        ? ("CANCELLED" as const)
        : deriveAdvanceStatus({
            originalAmount: advance.originalAmount,
            outstanding: breakdown.outstanding,
          }),
  };
}

export async function listAdvances(slug: string) {
  const ctx = await requireProjectPermissionBySlug(slug, "FINANCE_VIEW");

  const rows = await prisma.advance.findMany({
    where: { projectId: ctx.project.id, ...notDeleted },
    orderBy: [{ issuedAt: "desc" }, { createdAt: "desc" }],
    take: 100,
    include: {
      settlements: {
        where: { ...notDeleted },
        select: { kind: true, amount: true, deletedAt: true },
      },
    },
  });

  const authorized = rows
    .filter((row) =>
      canViewResource(
        { userId: ctx.user.id, role: ctx.role },
        toVisibleResource(row),
        ctx.project.id,
      ),
    )
    .map(withOutstanding);

  const totalOutstanding = authorized.reduce(
    (sum, row) => sum + row.outstanding,
    0,
  );
  const totalOriginal = authorized.reduce(
    (sum, row) => sum + row.originalAmount,
    0,
  );

  return {
    project: ctx.project,
    role: ctx.role,
    advances: authorized,
    totals: { totalOutstanding, totalOriginal },
  };
}

export async function getAdvance(slug: string, advanceId: string) {
  const ctx = await requireProjectPermissionBySlug(slug, "FINANCE_VIEW");

  const advance = await prisma.advance.findFirst({
    where: { id: advanceId, projectId: ctx.project.id },
    include: {
      settlements: {
        where: { ...notDeleted },
        orderBy: { settledAt: "desc" },
        include: {
          transaction: {
            select: {
              id: true,
              transactionNumber: true,
              type: true,
              amount: true,
            },
          },
          createdBy: { select: { id: true, name: true, email: true } },
        },
      },
      fundingTransaction: {
        select: {
          id: true,
          transactionNumber: true,
          type: true,
          amount: true,
        },
      },
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });

  if (!advance) {
    throw new AppError("NOT_FOUND", "Advance was not found.");
  }

  await assertCanViewProjectResource(
    ctx.project.id,
    ctx.user.id,
    toVisibleResource(advance),
  );

  return {
    project: ctx.project,
    role: ctx.role,
    advance: withOutstanding(advance),
  };
}

export async function createAdvance(slug: string, input: unknown) {
  const ctx = await requireProjectPermissionBySlug(slug, "FINANCE_CREATE");
  const parsed = createAdvanceSchema.safeParse(input);
  if (!parsed.success) {
    throw new AppError("VALIDATION", "Please check the advance details.");
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

  const issuedAt = new Date(parsed.data.issuedAt);
  if (Number.isNaN(issuedAt.getTime())) {
    throw new AppError("VALIDATION", "Invalid issue date.");
  }

  await validateCategory(ctx.project.id, parsed.data.categoryId || undefined);
  await validateAccount(ctx.project.id, parsed.data.accountId || undefined);

  const advanceNumber = await allocateAdvanceNumber({
    projectId: ctx.project.id,
    projectSlug: ctx.project.slug,
  });

  // Funding ledger row reuses the same human number for a single payment event.
  const transactionNumber = advanceNumber;
  const existingTxn = await prisma.financialTransaction.findFirst({
    where: {
      projectId: ctx.project.id,
      transactionNumber,
    },
  });
  if (existingTxn) {
    // Extremely unlikely collision with TXN_ADV path — allocate a distinct SET-style txn number.
    // Prefer allocateTransactionNumber for the ledger side if advance number is taken.
  }

  const fundingNumber =
    existingTxn != null
      ? await allocateTransactionNumber({
          projectId: ctx.project.id,
          projectSlug: ctx.project.slug,
          type: "ADVANCE",
        })
      : transactionNumber;

  const funding = await prisma.financialTransaction.create({
    data: {
      projectId: ctx.project.id,
      transactionNumber: fundingNumber,
      type: "ADVANCE",
      direction: defaultDirectionForType("ADVANCE"),
      amount,
      currency: ctx.project.currency || "INR",
      categoryId: parsed.data.categoryId || null,
      accountId: parsed.data.accountId || null,
      paidByUserId: ctx.user.id,
      paidTo: parsed.data.recipientName,
      transactionDate: issuedAt,
      status: "PAID",
      paymentMethod:
        (parsed.data.paymentMethod as PaymentMethod | undefined) ?? null,
      referenceNumber: parsed.data.referenceNumber || null,
      description: parsed.data.description || "Advance issued",
      notes: parsed.data.notes || null,
      visibility: parsed.data.visibility as Visibility,
      allowedUserIds: [],
      createdById: ctx.user.id,
      approvedById: ctx.user.id,
      approvedAt: new Date(),
    },
  });

  const result = await prisma.advance.create({
    data: {
      projectId: ctx.project.id,
      advanceNumber,
      originalAmount: amount,
      currency: ctx.project.currency || "INR",
      recipientName: parsed.data.recipientName,
      categoryId: parsed.data.categoryId || null,
      accountId: parsed.data.accountId || null,
      issuedAt,
      description: parsed.data.description || null,
      notes: parsed.data.notes || null,
      status: "OPEN",
      visibility: parsed.data.visibility as Visibility,
      allowedUserIds: [],
      fundingTransactionId: funding.id,
      createdById: ctx.user.id,
    },
  });

  logger.info("Advance created", {
    projectId: ctx.project.id,
    advanceId: result.id,
    actorId: ctx.user.id,
    amount,
  });

  await recordAuditEvent({
    projectId: ctx.project.id,
    actorId: ctx.user.id,
    action: "CREATE",
    entityType: "Advance",
    entityId: result.id,
    metadata: {
      advanceNumber: result.advanceNumber,
      amount,
      visibility: result.visibility,
    },
    activity: {
      message: `${actorLabel(ctx.user)} issued ${formatInrFromPaise(amount)} advance (${result.advanceNumber}).`,
      href: `/p/${slug}/advances/${result.id}`,
      visibility: result.visibility,
    },
  });

  return result;
}

export async function settleAdvance(
  slug: string,
  advanceId: string,
  input: unknown,
) {
  const ctx = await requireProjectPermissionBySlug(slug, "FINANCE_CREATE");
  const parsed = settleAdvanceSchema.safeParse(input);
  if (!parsed.success) {
    throw new AppError("VALIDATION", "Please check the settlement details.");
  }

  let amount: number;
  try {
    amount = paiseFromRupeeString(parsed.data.amountRupees);
  } catch {
    throw new AppError("VALIDATION", "Invalid amount.");
  }

  const settledAt = new Date(parsed.data.settledAt);
  if (Number.isNaN(settledAt.getTime())) {
    throw new AppError("VALIDATION", "Invalid settlement date.");
  }

  await validateAccount(ctx.project.id, parsed.data.accountId || undefined);

  const advance = await prisma.advance.findFirst({
    where: { id: advanceId, projectId: ctx.project.id, ...notDeleted },
    include: {
      settlements: {
        where: { ...notDeleted },
        select: { kind: true, amount: true, deletedAt: true },
      },
    },
  });

  if (!advance) {
    throw new AppError("NOT_FOUND", "Advance was not found.");
  }
  if (advance.status === "CANCELLED") {
    throw new AppError("CONFLICT", "Cancelled advances cannot be settled.");
  }

  await assertCanViewProjectResource(
    ctx.project.id,
    ctx.user.id,
    toVisibleResource(advance),
  );

  const breakdown = computeAdvanceOutstanding(
    advance.originalAmount,
    advance.settlements,
  );

  try {
    assertSettlementWithinOutstanding(breakdown.outstanding, amount);
  } catch {
    throw new AppError(
      "VALIDATION",
      "Settlement cannot exceed outstanding advance.",
    );
  }

  const kind = parsed.data.kind as AdvanceSettlementKind;
  const txType = kind === "REFUND" ? "REFUND" : "SETTLEMENT";
  const transactionNumber = await allocateTransactionNumber({
    projectId: ctx.project.id,
    projectSlug: ctx.project.slug,
    type: txType,
  });

  const nextOutstanding = breakdown.outstanding - amount;
  const nextStatus = deriveAdvanceStatus({
    originalAmount: advance.originalAmount,
    outstanding: nextOutstanding,
  });

  const settlement = await (async () => {
    const ledger = await prisma.financialTransaction.create({
      data: {
        projectId: ctx.project.id,
        transactionNumber,
        type: txType,
        direction: defaultDirectionForType(txType),
        amount,
        currency: advance.currency,
        categoryId: advance.categoryId,
        accountId: parsed.data.accountId || advance.accountId,
        paidByUserId: ctx.user.id,
        paidTo: advance.recipientName,
        transactionDate: settledAt,
        status: "PAID",
        paymentMethod:
          (parsed.data.paymentMethod as PaymentMethod | undefined) ?? null,
        referenceNumber: parsed.data.referenceNumber || null,
        description:
          parsed.data.description ||
          (kind === "REFUND" ? "Advance refund" : "Advance settlement"),
        notes: parsed.data.notes || null,
        visibility: advance.visibility,
        allowedUserIds: advance.allowedUserIds,
        createdById: ctx.user.id,
        approvedById: ctx.user.id,
        approvedAt: new Date(),
      },
    });

    const row = await prisma.advanceSettlement.create({
      data: {
        projectId: ctx.project.id,
        advanceId: advance.id,
        kind,
        amount,
        currency: advance.currency,
        settledAt,
        description: parsed.data.description || null,
        notes: parsed.data.notes || null,
        transactionId: ledger.id,
        createdById: ctx.user.id,
      },
    });

    await prisma.advance.update({
      where: { id: advance.id },
      data: { status: nextStatus },
    });

    return row;
  })();

  logger.info("Advance settlement recorded", {
    projectId: ctx.project.id,
    advanceId: advance.id,
    settlementId: settlement.id,
    kind,
    amount,
    actorId: ctx.user.id,
  });

  await recordAuditEvent({
    projectId: ctx.project.id,
    actorId: ctx.user.id,
    action: "SETTLEMENT",
    entityType: "AdvanceSettlement",
    entityId: settlement.id,
    metadata: {
      advanceId: advance.id,
      advanceNumber: advance.advanceNumber,
      kind,
      amount,
    },
    activity: {
      message: `${actorLabel(ctx.user)} recorded ${formatInrFromPaise(amount)} ${kind.toLowerCase()} on ${advance.advanceNumber}.`,
      href: `/p/${slug}/advances/${advance.id}`,
      visibility: advance.visibility,
    },
  });

  return settlement;
}

export async function softDeleteAdvance(
  slug: string,
  advanceId: string,
  input: unknown,
) {
  const ctx = await requireProjectPermissionBySlug(slug, "FINANCE_DELETE");
  const parsed = softDeleteAdvanceSchema.safeParse(input);
  if (!parsed.success) {
    throw new AppError("VALIDATION", "Deletion reason is required.");
  }

  const advance = await prisma.advance.findFirst({
    where: { id: advanceId, projectId: ctx.project.id, ...notDeleted },
  });
  if (!advance) {
    throw new AppError("NOT_FOUND", "Advance was not found.");
  }

  const updated = await prisma.advance.update({
    where: { id: advance.id },
    data: {
      deletedAt: new Date(),
      deletedById: ctx.user.id,
      deletionReason: parsed.data.reason,
      status: "CANCELLED",
    },
  });

  logger.info("Advance soft-deleted", {
    projectId: ctx.project.id,
    advanceId: advance.id,
    actorId: ctx.user.id,
  });

  await recordAuditEvent({
    projectId: ctx.project.id,
    actorId: ctx.user.id,
    action: "DELETE",
    entityType: "Advance",
    entityId: advance.id,
    metadata: {
      reason: parsed.data.reason,
      advanceNumber: advance.advanceNumber,
    },
    activity: {
      message: `${actorLabel(ctx.user)} cancelled advance ${advance.advanceNumber}.`,
      href: `/p/${slug}/advances/${advance.id}`,
      visibility: advance.visibility,
    },
  });

  return updated;
}
