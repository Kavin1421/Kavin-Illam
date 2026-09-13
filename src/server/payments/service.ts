import type { PaymentMethod, Visibility } from "@prisma/client";

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
  allocatePaymentRequestNumber,
  allocateTransactionNumber,
} from "@/server/finance/numbering";
import { defaultDirectionForType } from "@/server/finance/totals";
import {
  createPaymentRequestSchema,
  payPaymentRequestSchema,
  resubmitPaymentRequestSchema,
  reviewPaymentRequestSchema,
} from "@/validators/payments";

import {
  assertCanMarkPaid,
  assertCanPay,
  assertValidReviewTransition,
  derivePaymentRequestStatus,
} from "./invariants";
import { notifyPaymentRequestCreated } from "./notify";

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

export async function listPaymentRequests(slug: string) {
  const ctx = await requireProjectPermissionBySlug(slug, "FINANCE_VIEW");

  const rows = await prisma.paymentRequest.findMany({
    where: { projectId: ctx.project.id, ...notDeleted },
    orderBy: [{ createdAt: "desc" }],
    take: 100,
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      category: { select: { id: true, name: true, code: true } },
    },
  });

  const authorized = rows.filter((row) =>
    canViewResource(
      { userId: ctx.user.id, role: ctx.role },
      toVisibleResource(row),
      ctx.project.id,
    ),
  );

  const pendingCount = authorized.filter((r) => r.status === "PENDING").length;
  const approvedCount = authorized.filter(
    (r) => r.status === "APPROVED",
  ).length;

  return {
    project: ctx.project,
    role: ctx.role,
    requests: authorized,
    totals: { pendingCount, approvedCount, total: authorized.length },
  };
}

export async function getPaymentRequest(slug: string, requestId: string) {
  const ctx = await requireProjectPermissionBySlug(slug, "FINANCE_VIEW");

  const request = await prisma.paymentRequest.findFirst({
    where: { id: requestId, projectId: ctx.project.id },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      reviewedBy: { select: { id: true, name: true, email: true } },
      linkedTransaction: {
        select: {
          id: true,
          transactionNumber: true,
          amount: true,
          type: true,
          transactionDate: true,
        },
      },
      category: { select: { id: true, name: true, code: true } },
    },
  });

  if (!request) {
    throw new AppError("NOT_FOUND", "Payment request was not found.");
  }

  await assertCanViewProjectResource(
    ctx.project.id,
    ctx.user.id,
    toVisibleResource(request),
  );

  return { project: ctx.project, role: ctx.role, request };
}

export async function createPaymentRequest(slug: string, input: unknown) {
  const ctx = await requireProjectPermissionBySlug(
    slug,
    "PAYMENT_REQUEST_CREATE",
  );
  const parsed = createPaymentRequestSchema.safeParse(input);
  if (!parsed.success) {
    throw new AppError("VALIDATION", "Please check the payment request.");
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

  await validateCategory(ctx.project.id, parsed.data.categoryId || undefined);

  let dueDate: Date | null = null;
  if (parsed.data.dueDate?.trim()) {
    dueDate = new Date(parsed.data.dueDate);
    if (Number.isNaN(dueDate.getTime())) {
      throw new AppError("VALIDATION", "Invalid due date.");
    }
  }

  const requestNumber = await allocatePaymentRequestNumber({
    projectId: ctx.project.id,
    projectSlug: ctx.project.slug,
  });

  const request = await prisma.paymentRequest.create({
    data: {
      projectId: ctx.project.id,
      requestNumber,
      title: parsed.data.title,
      description: parsed.data.description || null,
      amount,
      paidAmount: 0,
      currency: ctx.project.currency || "INR",
      categoryId: parsed.data.categoryId || null,
      payeeName: parsed.data.payeeName || null,
      dueDate,
      status: "PENDING",
      visibility: parsed.data.visibility as Visibility,
      allowedUserIds: [],
      createdById: ctx.user.id,
    },
  });

  logger.info("Payment request created", {
    projectId: ctx.project.id,
    requestId: request.id,
    actorId: ctx.user.id,
  });

  await recordAuditEvent({
    projectId: ctx.project.id,
    actorId: ctx.user.id,
    action: "CREATE",
    entityType: "PaymentRequest",
    entityId: request.id,
    metadata: {
      requestNumber: request.requestNumber,
      amount: request.amount,
      visibility: request.visibility,
    },
    activity: {
      message: `${actorLabel(ctx.user)} requested ${formatInrFromPaise(request.amount)} — ${request.title}.`,
      href: `/p/${slug}/payment-requests/${request.id}`,
      visibility: request.visibility,
    },
  });

  await notifyPaymentRequestCreated({
    projectId: ctx.project.id,
    projectSlug: ctx.project.slug,
    projectName: ctx.project.name,
    requestId: request.id,
    requestNumber: request.requestNumber,
    title: request.title,
    amountPaise: request.amount,
    requesterName: actorLabel(ctx.user),
  });

  return request;
}

export async function reviewPaymentRequest(
  slug: string,
  requestId: string,
  input: unknown,
) {
  const ctx = await requireProjectPermissionBySlug(
    slug,
    "PAYMENT_REQUEST_APPROVE",
  );
  const parsed = reviewPaymentRequestSchema.safeParse(input);
  if (!parsed.success) {
    throw new AppError("VALIDATION", "Invalid review action.");
  }

  const request = await prisma.paymentRequest.findFirst({
    where: { id: requestId, projectId: ctx.project.id, ...notDeleted },
  });
  if (!request) {
    throw new AppError("NOT_FOUND", "Payment request was not found.");
  }

  await assertCanViewProjectResource(
    ctx.project.id,
    ctx.user.id,
    toVisibleResource(request),
  );

  const nextStatus =
    parsed.data.action === "APPROVE"
      ? ("APPROVED" as const)
      : parsed.data.action === "REJECT"
        ? ("REJECTED" as const)
        : ("CHANGES_REQUESTED" as const);

  try {
    assertValidReviewTransition(request.status, nextStatus);
  } catch (error) {
    throw new AppError(
      "CONFLICT",
      error instanceof Error ? error.message : "Invalid status transition.",
    );
  }

  if (
    (nextStatus === "REJECTED" || nextStatus === "CHANGES_REQUESTED") &&
    !parsed.data.reviewNote?.trim()
  ) {
    throw new AppError("VALIDATION", "A review note is required.");
  }

  const updated = await prisma.paymentRequest.update({
    where: { id: request.id },
    data: {
      status: nextStatus,
      reviewNote: parsed.data.reviewNote || null,
      reviewedById: ctx.user.id,
      reviewedAt: new Date(),
    },
  });

  logger.info("Payment request reviewed", {
    projectId: ctx.project.id,
    requestId: request.id,
    action: parsed.data.action,
    actorId: ctx.user.id,
  });

  const auditAction =
    parsed.data.action === "APPROVE"
      ? ("APPROVE" as const)
      : parsed.data.action === "REJECT"
        ? ("REJECT" as const)
        : ("REQUEST_CHANGES" as const);

  await recordAuditEvent({
    projectId: ctx.project.id,
    actorId: ctx.user.id,
    action: auditAction,
    entityType: "PaymentRequest",
    entityId: request.id,
    metadata: {
      requestNumber: request.requestNumber,
      fromStatus: request.status,
      toStatus: nextStatus,
    },
    activity: {
      message: `${actorLabel(ctx.user)} ${auditAction === "APPROVE" ? "approved" : auditAction === "REJECT" ? "rejected" : "requested changes on"} ${request.requestNumber}.`,
      href: `/p/${slug}/payment-requests/${request.id}`,
      visibility: request.visibility,
    },
  });

  return updated;
}

export async function resubmitPaymentRequest(
  slug: string,
  requestId: string,
  input: unknown,
) {
  const ctx = await requireProjectPermissionBySlug(
    slug,
    "PAYMENT_REQUEST_CREATE",
  );
  const parsed = resubmitPaymentRequestSchema.safeParse(input);
  if (!parsed.success) {
    throw new AppError("VALIDATION", "Invalid resubmit details.");
  }

  const request = await prisma.paymentRequest.findFirst({
    where: { id: requestId, projectId: ctx.project.id, ...notDeleted },
  });
  if (!request) {
    throw new AppError("NOT_FOUND", "Payment request was not found.");
  }
  if (request.status !== "CHANGES_REQUESTED") {
    throw new AppError(
      "CONFLICT",
      "Only requests needing changes can be resubmitted.",
    );
  }
  if (request.createdById !== ctx.user.id) {
    throw new AppError("FORBIDDEN", "Only the requester can resubmit.");
  }

  let amount = request.amount;
  if (parsed.data.amountRupees?.trim()) {
    try {
      amount = paiseFromRupeeString(parsed.data.amountRupees);
    } catch {
      throw new AppError("VALIDATION", "Invalid amount.");
    }
    if (amount <= 0) {
      throw new AppError("VALIDATION", "Amount must be greater than zero.");
    }
  }

  const updated = await prisma.paymentRequest.update({
    where: { id: request.id },
    data: {
      title: parsed.data.title?.trim() || request.title,
      description:
        parsed.data.description !== undefined
          ? parsed.data.description || null
          : request.description,
      amount,
      status: "PENDING",
      reviewNote: null,
    },
  });

  return updated;
}

/**
 * Pays an approved request by creating ONE ledger EXPENSE and linking it.
 * Never marks PAID without linkedTransactionId.
 */
export async function payPaymentRequest(
  slug: string,
  requestId: string,
  input: unknown,
) {
  const ctx = await requireProjectPermissionBySlug(
    slug,
    "PAYMENT_REQUEST_APPROVE",
  );
  const parsed = payPaymentRequestSchema.safeParse(input);
  if (!parsed.success) {
    throw new AppError("VALIDATION", "Please check the payment details.");
  }

  let payAmount: number;
  try {
    payAmount = paiseFromRupeeString(parsed.data.amountRupees);
  } catch {
    throw new AppError("VALIDATION", "Invalid amount.");
  }
  if (payAmount <= 0) {
    throw new AppError("VALIDATION", "Amount must be greater than zero.");
  }

  const paymentDate = new Date(parsed.data.paymentDate);
  if (Number.isNaN(paymentDate.getTime())) {
    throw new AppError("VALIDATION", "Invalid payment date.");
  }

  await validateAccount(ctx.project.id, parsed.data.accountId || undefined);

  const request = await prisma.paymentRequest.findFirst({
    where: { id: requestId, projectId: ctx.project.id, ...notDeleted },
  });
  if (!request) {
    throw new AppError("NOT_FOUND", "Payment request was not found.");
  }

  await assertCanViewProjectResource(
    ctx.project.id,
    ctx.user.id,
    toVisibleResource(request),
  );

  try {
    assertCanPay(request.status);
  } catch (error) {
    throw new AppError(
      "CONFLICT",
      error instanceof Error ? error.message : "Cannot pay this request.",
    );
  }

  if (request.linkedTransactionId) {
    throw new AppError(
      "CONFLICT",
      "This request already has a linked payment.",
    );
  }

  const remaining = request.amount - request.paidAmount;
  if (payAmount > remaining) {
    throw new AppError(
      "VALIDATION",
      "Payment amount cannot exceed the remaining requested amount.",
    );
  }

  const transactionNumber = await allocateTransactionNumber({
    projectId: ctx.project.id,
    projectSlug: ctx.project.slug,
    type: "EXPENSE",
  });

  const ledger = await prisma.financialTransaction.create({
    data: {
      projectId: ctx.project.id,
      transactionNumber,
      type: "EXPENSE",
      direction: defaultDirectionForType("EXPENSE"),
      amount: payAmount,
      currency: request.currency,
      categoryId: request.categoryId,
      accountId: parsed.data.accountId || request.accountId,
      paidByUserId: ctx.user.id,
      paidTo: request.payeeName,
      transactionDate: paymentDate,
      status: "PAID",
      paymentMethod:
        (parsed.data.paymentMethod as PaymentMethod | undefined) ?? null,
      referenceNumber: parsed.data.referenceNumber || null,
      description: `Payment for ${request.requestNumber}: ${request.title}`,
      notes: parsed.data.notes || null,
      visibility: request.visibility,
      allowedUserIds: request.allowedUserIds,
      createdById: ctx.user.id,
      approvedById: ctx.user.id,
      approvedAt: new Date(),
    },
  });

  const paidAmount = request.paidAmount + payAmount;
  let nextStatus: "PAID" | "PARTIALLY_PAID";
  try {
    assertCanMarkPaid({
      linkedTransactionId: ledger.id,
      paidAmount,
      paymentDate,
    });
    nextStatus = derivePaymentRequestStatus({
      requestedAmount: request.amount,
      paidAmount,
      hasLinkedTransaction: true,
    });
  } catch (error) {
    await prisma.financialTransaction.update({
      where: { id: ledger.id },
      data: {
        deletedAt: new Date(),
        deletedById: ctx.user.id,
        deletionReason: "Payment request invariant failed",
      },
    });
    throw new AppError(
      "VALIDATION",
      error instanceof Error ? error.message : "Cannot mark request as paid.",
    );
  }

  const updated = await prisma.paymentRequest.update({
    where: { id: request.id },
    data: {
      linkedTransactionId: ledger.id,
      paidAmount,
      status: nextStatus,
      paidAt: paymentDate,
      reviewedById: request.reviewedById ?? ctx.user.id,
      reviewedAt: request.reviewedAt ?? new Date(),
    },
  });

  logger.info("Payment request paid", {
    projectId: ctx.project.id,
    requestId: request.id,
    transactionId: ledger.id,
    paidAmount,
    status: nextStatus,
    actorId: ctx.user.id,
  });

  await recordAuditEvent({
    projectId: ctx.project.id,
    actorId: ctx.user.id,
    action: "PAYMENT",
    entityType: "PaymentRequest",
    entityId: request.id,
    metadata: {
      requestNumber: request.requestNumber,
      paidAmount: payAmount,
      linkedTransactionId: ledger.id,
      status: nextStatus,
    },
    activity: {
      message: `${actorLabel(ctx.user)} paid ${formatInrFromPaise(payAmount)} for ${request.requestNumber}.`,
      href: `/p/${slug}/payment-requests/${request.id}`,
      visibility: request.visibility,
    },
  });

  return updated;
}
