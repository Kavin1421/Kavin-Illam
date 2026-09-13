import type { Visibility } from "@prisma/client";

import {
  canViewResource,
  includeInSharedProjectTotals,
  requireProjectMemberBySlug,
  roleHasPermission,
  type VisibleResource,
} from "@/server/authorization";
import {
  computeAdvanceOutstanding,
  deriveAdvanceStatus,
} from "@/server/advances/outstanding";
import {
  computeBudgetRollup,
  isBudgetConsumingLedgerType,
  openCommitmentFromRequest,
} from "@/server/budget/math";
import { prisma } from "@/server/db/prisma";
import { sumAuthorizedFinanceTotals } from "@/server/finance/totals";
import { isOpenTaskStatus } from "@/server/tasks/transitions";

import { rankCategorySpend, buildMonthlyMoneySeries } from "./spend";

function toVisibleResource(row: {
  projectId: string;
  visibility: Visibility;
  createdById: string;
  allowedUserIds?: string[] | null;
  deletedAt?: Date | null;
  archivedAt?: Date | null;
}): VisibleResource {
  return {
    projectId: row.projectId,
    visibility: row.visibility,
    createdById: row.createdById,
    allowedUserIds: row.allowedUserIds ?? [],
    deletedAt: row.deletedAt ?? row.archivedAt ?? null,
  };
}

export type DashboardActivityItem = {
  id: string;
  kind:
    | "TRANSACTION"
    | "PAYMENT_REQUEST"
    | "ADVANCE"
    | "DOCUMENT"
    | "TASK"
    | "MILESTONE";
  title: string;
  subtitle: string;
  href: string;
  at: Date;
};

/**
 * Premium project dashboard — all aggregates are server-side and visibility-filtered.
 * Shared money figures never include PRIVATE rows.
 */
export async function getProjectDashboard(slug: string) {
  const ctx = await requireProjectMemberBySlug(slug);
  const viewer = { userId: ctx.user.id, role: ctx.role };
  const projectId = ctx.project.id;
  const now = new Date();
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const [
    transactions,
    paymentRequests,
    advances,
    budget,
    documents,
    tasks,
    milestones,
    categories,
  ] = await Promise.all([
    prisma.financialTransaction.findMany({
      where: { projectId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        projectId: true,
        transactionNumber: true,
        type: true,
        amount: true,
        status: true,
        direction: true,
        visibility: true,
        createdById: true,
        allowedUserIds: true,
        deletedAt: true,
        categoryId: true,
        description: true,
        createdAt: true,
        transactionDate: true,
        category: { select: { id: true, name: true } },
      },
    }),
    prisma.paymentRequest.findMany({
      where: { projectId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        projectId: true,
        requestNumber: true,
        title: true,
        amount: true,
        paidAmount: true,
        status: true,
        visibility: true,
        createdById: true,
        allowedUserIds: true,
        deletedAt: true,
        categoryId: true,
        dueDate: true,
        createdAt: true,
      },
    }),
    prisma.advance.findMany({
      where: { projectId, deletedAt: null },
      orderBy: { issuedAt: "desc" },
      take: 50,
      include: {
        settlements: {
          where: { deletedAt: null },
          select: { kind: true, amount: true, deletedAt: true },
        },
      },
    }),
    prisma.budget.findFirst({
      where: { projectId, status: "ACTIVE" },
      include: {
        categories: {
          orderBy: { sortOrder: "asc" },
          select: {
            id: true,
            categoryId: true,
            label: true,
            plannedAmount: true,
          },
        },
      },
    }),
    prisma.document.findMany({
      where: { projectId, status: "ACTIVE" },
      orderBy: { updatedAt: "desc" },
      take: 40,
      select: {
        id: true,
        projectId: true,
        documentNumber: true,
        title: true,
        category: true,
        visibility: true,
        createdById: true,
        allowedUserIds: true,
        expiryDate: true,
        updatedAt: true,
        createdAt: true,
        archivedAt: true,
      },
    }),
    prisma.task.findMany({
      where: { projectId },
      orderBy: [{ dueDate: "asc" }, { updatedAt: "desc" }],
      take: 40,
      select: {
        id: true,
        projectId: true,
        taskNumber: true,
        title: true,
        status: true,
        priority: true,
        dueDate: true,
        visibility: true,
        createdById: true,
        allowedUserIds: true,
        updatedAt: true,
        createdAt: true,
      },
    }),
    prisma.milestone.findMany({
      where: { projectId },
      orderBy: [{ targetDate: "asc" }, { sortOrder: "asc" }],
      take: 20,
      select: {
        id: true,
        projectId: true,
        milestoneNumber: true,
        title: true,
        status: true,
        targetDate: true,
        visibility: true,
        createdById: true,
        allowedUserIds: true,
        updatedAt: true,
        createdAt: true,
      },
    }),
    prisma.category.findMany({
      where: {
        OR: [{ isSystem: true, projectId: null }, { projectId }],
      },
      select: { id: true, name: true },
    }),
  ]);

  const categoryName = new Map(categories.map((c) => [c.id, c.name]));

  const visibleTx = transactions.filter((row) =>
    canViewResource(viewer, toVisibleResource(row), projectId),
  );
  const sharedTx = visibleTx.filter((row) =>
    includeInSharedProjectTotals(toVisibleResource(row)),
  );

  const financeTotals = sumAuthorizedFinanceTotals(sharedTx);

  const spendSlices = sharedTx
    .filter(
      (row) =>
        isBudgetConsumingLedgerType(row.type) &&
        (row.status === "PAID" ||
          row.status === "PARTIALLY_PAID" ||
          row.status === "APPROVED"),
    )
    .map((row) => ({
      categoryId: row.categoryId,
      categoryName:
        row.category?.name ??
        categoryName.get(row.categoryId ?? "") ??
        "Uncategorized",
      amount: row.amount,
    }));
  const topSpend = rankCategorySpend(spendSlices, 6);

  const visibleRequests = paymentRequests.filter((row) =>
    canViewResource(viewer, toVisibleResource(row), projectId),
  );
  const sharedRequests = visibleRequests.filter((row) =>
    includeInSharedProjectTotals(toVisibleResource(row)),
  );

  const pendingRequests = sharedRequests.filter(
    (r) => r.status === "PENDING" || r.status === "CHANGES_REQUESTED",
  );
  const approvedToPay = sharedRequests.filter((r) => r.status === "APPROVED");

  const commitmentSlices = sharedRequests
    .map((row) => ({
      categoryId: row.categoryId,
      amount: openCommitmentFromRequest({
        status: row.status,
        amount: row.amount,
        paidAmount: row.paidAmount,
      }),
    }))
    .filter((s) => s.amount > 0);

  const budgetConsumingTx = sharedTx.filter(
    (row) =>
      isBudgetConsumingLedgerType(row.type) &&
      (row.status === "PAID" ||
        row.status === "PARTIALLY_PAID" ||
        row.status === "APPROVED"),
  );

  const paidSlices = budgetConsumingTx.map((row) => ({
    categoryId: row.categoryId,
    amount: row.amount,
  }));

  const kolkataYear = Number(
    new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
    }).format(now),
  );

  const monthlySpend = buildMonthlyMoneySeries(
    budgetConsumingTx.map((row) => ({
      at: row.transactionDate ?? row.createdAt,
      amount: row.amount,
    })),
    sharedRequests
      .map((row) => ({
        at: row.dueDate ?? row.createdAt,
        amount: openCommitmentFromRequest({
          status: row.status,
          amount: row.amount,
          paidAmount: row.paidAmount,
        }),
      }))
      .filter((row) => row.amount > 0),
    kolkataYear,
  );
  const budgetLines = (budget?.categories ?? []).map((line) => ({
    categoryId: line.categoryId,
    label: line.label,
    plannedAmount: line.plannedAmount,
  }));

  const budgetRollup = computeBudgetRollup({
    lines: budgetLines,
    totalPlannedOverride:
      budget?.totalPlanned ?? ctx.project.estimatedBudget ?? null,
    paid: paidSlices,
    commitments: commitmentSlices,
  });

  const visibleAdvances = advances.filter((row) =>
    canViewResource(viewer, toVisibleResource(row), projectId),
  );
  const sharedAdvances = visibleAdvances.filter((row) =>
    includeInSharedProjectTotals(toVisibleResource(row)),
  );

  const advanceRows = sharedAdvances.map((advance) => {
    const breakdown = computeAdvanceOutstanding(
      advance.originalAmount,
      advance.settlements,
    );
    const status =
      advance.status === "CANCELLED"
        ? ("CANCELLED" as const)
        : deriveAdvanceStatus({
            originalAmount: advance.originalAmount,
            outstanding: breakdown.outstanding,
          });
    return {
      id: advance.id,
      advanceNumber: advance.advanceNumber,
      recipientName: advance.recipientName,
      ...breakdown,
      status,
    };
  });

  const outstandingAdvances = advanceRows.reduce(
    (sum, row) => sum + row.outstanding,
    0,
  );

  const visibleDocs = documents.filter((row) =>
    canViewResource(viewer, toVisibleResource(row), projectId),
  );
  const expiringDocuments = visibleDocs.filter(
    (doc) =>
      doc.expiryDate != null &&
      doc.expiryDate >= now &&
      doc.expiryDate <= in30Days,
  );

  const visibleTasks = tasks.filter((row) =>
    canViewResource(viewer, toVisibleResource(row), projectId),
  );
  const openTasks = visibleTasks.filter((t) => isOpenTaskStatus(t.status));
  const overdueTasks = openTasks.filter(
    (t) => t.dueDate != null && t.dueDate < now,
  );

  const visibleMilestones = milestones.filter((row) =>
    canViewResource(viewer, toVisibleResource(row), projectId),
  );
  const upcomingMilestones = visibleMilestones
    .filter(
      (m) =>
        m.status === "UPCOMING" ||
        m.status === "IN_PROGRESS" ||
        (m.targetDate != null &&
          m.targetDate >= now &&
          m.status !== "COMPLETED" &&
          m.status !== "CANCELLED"),
    )
    .slice(0, 5);

  const milestoneActive = visibleMilestones.filter(
    (m) => m.status !== "CANCELLED",
  );
  const milestoneCompleted = milestoneActive.filter(
    (m) => m.status === "COMPLETED",
  ).length;
  const milestoneTotal = milestoneActive.length;
  const milestonePercent =
    milestoneTotal > 0
      ? Math.round((milestoneCompleted * 100) / milestoneTotal)
      : 0;

  const recentTransactions = visibleTx.slice(0, 6).map((tx) => ({
    id: tx.id,
    title: tx.description || `${tx.type} ${tx.transactionNumber}`,
    categoryName: tx.category?.name ?? "Uncategorized",
    amount: tx.amount,
    status: tx.status,
    type: tx.type,
    direction: tx.direction,
    at: tx.transactionDate ?? tx.createdAt,
  }));

  const recentDocuments = visibleDocs.slice(0, 4).map((doc) => ({
    id: doc.id,
    title: doc.title,
    category: doc.category,
    at: doc.updatedAt,
  }));

  const activity: DashboardActivityItem[] = [
    ...visibleTx.slice(0, 8).map((tx) => ({
      id: `tx-${tx.id}`,
      kind: "TRANSACTION" as const,
      title: tx.description || `${tx.type} ${tx.transactionNumber}`,
      subtitle: tx.transactionNumber,
      href: `/p/${slug}/finance/${tx.id}`,
      at: tx.createdAt,
    })),
    ...visibleRequests.slice(0, 6).map((req) => ({
      id: `pr-${req.id}`,
      kind: "PAYMENT_REQUEST" as const,
      title: req.title,
      subtitle: `${req.requestNumber} · ${req.status}`,
      href: `/p/${slug}/payment-requests/${req.id}`,
      at: req.createdAt,
    })),
    ...visibleAdvances.slice(0, 4).map((adv) => ({
      id: `adv-${adv.id}`,
      kind: "ADVANCE" as const,
      title: adv.description || `Advance ${adv.advanceNumber}`,
      subtitle: adv.advanceNumber,
      href: `/p/${slug}/advances/${adv.id}`,
      at: adv.createdAt,
    })),
    ...visibleDocs.slice(0, 4).map((doc) => ({
      id: `doc-${doc.id}`,
      kind: "DOCUMENT" as const,
      title: doc.title,
      subtitle: doc.documentNumber,
      href: `/p/${slug}/documents/${doc.id}`,
      at: doc.updatedAt,
    })),
    ...visibleTasks.slice(0, 6).map((task) => ({
      id: `task-${task.id}`,
      kind: "TASK" as const,
      title: task.title,
      subtitle: `${task.taskNumber} · ${task.status}`,
      href: `/p/${slug}/tasks/${task.id}`,
      at: task.updatedAt,
    })),
    ...visibleMilestones.slice(0, 4).map((ms) => ({
      id: `ms-${ms.id}`,
      kind: "MILESTONE" as const,
      title: ms.title,
      subtitle: `${ms.milestoneNumber} · ${ms.status}`,
      href: `/p/${slug}/milestones/${ms.id}`,
      at: ms.updatedAt,
    })),
  ]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 12);

  return {
    project: ctx.project,
    role: ctx.role,
    permissions: {
      canEditBudget: roleHasPermission(ctx.role, "BUDGET_EDIT"),
      canApprovePayments: roleHasPermission(
        ctx.role,
        "PAYMENT_REQUEST_APPROVE",
      ),
      canCreateFinance: roleHasPermission(ctx.role, "FINANCE_CREATE"),
    },
    summary: {
      spent: financeTotals.totalExpenses,
      income: financeTotals.totalIncome,
      netCashFlow: financeTotals.netCashFlow,
      outstandingAdvances,
      committed: budgetRollup.totals.committed,
      planned: budgetRollup.totals.planned,
      paid: budgetRollup.totals.paid,
      remainingVsPaid: budgetRollup.totals.remainingVsPaid,
      remainingVsCommitted: budgetRollup.totals.remainingVsCommitted,
      pendingRequestCount: pendingRequests.length,
      approvedToPayCount: approvedToPay.length,
      openTaskCount: openTasks.length,
      overdueTaskCount: overdueTasks.length,
      expiringDocumentCount: expiringDocuments.length,
    },
    topSpend,
    monthlySpend,
    monthlySpendYear: kolkataYear,
    pendingRequests: pendingRequests.slice(0, 5),
    approvedToPay: approvedToPay.slice(0, 5),
    advanceRows: advanceRows.filter((a) => a.outstanding > 0).slice(0, 5),
    overdueTasks: overdueTasks.slice(0, 5),
    upcomingMilestones,
    expiringDocuments: expiringDocuments.slice(0, 5),
    activity,
    recentTransactions,
    recentDocuments,
    milestoneProgress: {
      total: milestoneTotal,
      completed: milestoneCompleted,
      percent: milestonePercent,
      timeline: milestoneActive.slice(0, 6).map((ms) => ({
        id: ms.id,
        title: ms.title,
        status: ms.status,
        targetDate: ms.targetDate,
      })),
    },
  };
}
