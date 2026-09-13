import type { Visibility } from "@prisma/client";

import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { paiseFromRupeeString } from "@/lib/money";
import { actorLabel, recordAuditEvent } from "@/server/audit/record";
import {
  canViewResource,
  includeInSharedProjectTotals,
  requireProjectPermissionBySlug,
  type VisibleResource,
} from "@/server/authorization";
import { prisma } from "@/server/db/prisma";
import { budgetLineSchema, upsertBudgetSchema } from "@/validators/budget";
import { z } from "zod";

import {
  computeBudgetRollup,
  isBudgetConsumingLedgerType,
  openCommitmentFromRequest,
} from "./math";

function toVisibleResource(row: {
  projectId: string;
  visibility: Visibility;
  createdById: string;
  allowedUserIds: string[];
  deletedAt?: Date | null;
}): VisibleResource {
  return {
    projectId: row.projectId,
    visibility: row.visibility,
    createdById: row.createdById,
    allowedUserIds: row.allowedUserIds,
    deletedAt: row.deletedAt ?? null,
  };
}

export async function getBudgetDashboard(slug: string) {
  const ctx = await requireProjectPermissionBySlug(slug, "BUDGET_VIEW");

  const budget = await prisma.budget.findFirst({
    where: { projectId: ctx.project.id, status: "ACTIVE" },
    include: {
      categories: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        include: { category: { select: { id: true, name: true, code: true } } },
      },
    },
  });

  const [transactions, paymentRequests] = await Promise.all([
    prisma.financialTransaction.findMany({
      where: {
        projectId: ctx.project.id,
        deletedAt: null,
        status: { in: ["PAID", "PARTIALLY_PAID", "APPROVED"] },
      },
      select: {
        id: true,
        type: true,
        amount: true,
        categoryId: true,
        visibility: true,
        createdById: true,
        allowedUserIds: true,
        deletedAt: true,
        projectId: true,
        status: true,
      },
    }),
    prisma.paymentRequest.findMany({
      where: { projectId: ctx.project.id, deletedAt: null },
      select: {
        id: true,
        status: true,
        amount: true,
        paidAmount: true,
        categoryId: true,
        visibility: true,
        createdById: true,
        allowedUserIds: true,
        deletedAt: true,
        projectId: true,
      },
    }),
  ]);

  const viewer = { userId: ctx.user.id, role: ctx.role };

  const visibleTx = transactions.filter((row) =>
    canViewResource(viewer, toVisibleResource(row), ctx.project.id),
  );
  // Shared budget figures exclude PRIVATE; owner "your view" still uses authorized set
  // but architecture: private excluded from shared budget — use shared-only for rollup
  const sharedTx = visibleTx.filter((row) =>
    includeInSharedProjectTotals(toVisibleResource(row)),
  );

  const paidSlices = sharedTx
    .filter((row) => isBudgetConsumingLedgerType(row.type))
    .map((row) => ({
      categoryId: row.categoryId,
      amount: row.amount,
    }));

  const visibleRequests = paymentRequests.filter((row) =>
    canViewResource(viewer, toVisibleResource(row), ctx.project.id),
  );
  const sharedRequests = visibleRequests.filter((row) =>
    includeInSharedProjectTotals(toVisibleResource(row)),
  );

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

  const lines = (budget?.categories ?? []).map((line) => ({
    id: line.id,
    categoryId: line.categoryId,
    label: line.label,
    plannedAmount: line.plannedAmount,
  }));

  const rollup = computeBudgetRollup({
    lines,
    totalPlannedOverride: budget?.totalPlanned ?? null,
    paid: paidSlices,
    commitments: commitmentSlices,
  });

  return {
    project: ctx.project,
    role: ctx.role,
    budget,
    rollup,
  };
}

export async function upsertProjectBudget(slug: string, input: unknown) {
  const ctx = await requireProjectPermissionBySlug(slug, "BUDGET_EDIT");
  const parsed = upsertBudgetSchema.safeParse(input);
  if (!parsed.success) {
    throw new AppError("VALIDATION", "Please check the budget details.");
  }

  let linesRaw: unknown;
  try {
    linesRaw = JSON.parse(parsed.data.linesJson);
  } catch {
    throw new AppError("VALIDATION", "Invalid budget lines.");
  }

  const linesParsed = z.array(budgetLineSchema).min(1).safeParse(linesRaw);
  if (!linesParsed.success) {
    throw new AppError("VALIDATION", "Add at least one budget category line.");
  }

  const lines = linesParsed.data.map((line) => {
    let plannedAmount: number;
    try {
      plannedAmount = paiseFromRupeeString(line.plannedAmountRupees);
    } catch {
      throw new AppError("VALIDATION", `Invalid amount for ${line.label}.`);
    }
    if (plannedAmount < 0) {
      throw new AppError("VALIDATION", "Planned amounts cannot be negative.");
    }
    return {
      categoryId: line.categoryId || null,
      label: line.label,
      plannedAmount,
      notes: line.notes || null,
    };
  });

  for (const line of lines) {
    if (!line.categoryId) continue;
    const category = await prisma.category.findFirst({
      where: {
        id: line.categoryId,
        OR: [
          { isSystem: true, projectId: null },
          { projectId: ctx.project.id },
        ],
      },
    });
    if (!category) {
      throw new AppError("VALIDATION", `Invalid category for ${line.label}.`);
    }
  }

  let totalPlanned: number | null = null;
  if (parsed.data.totalPlannedRupees?.trim()) {
    try {
      totalPlanned = paiseFromRupeeString(parsed.data.totalPlannedRupees);
    } catch {
      throw new AppError("VALIDATION", "Invalid total planned amount.");
    }
  }

  const existing = await prisma.budget.findFirst({
    where: { projectId: ctx.project.id, status: "ACTIVE" },
  });

  if (existing) {
    await prisma.budgetCategory.deleteMany({
      where: { budgetId: existing.id },
    });
    const budget = await prisma.budget.update({
      where: { id: existing.id },
      data: {
        name: parsed.data.name,
        notes: parsed.data.notes || null,
        totalPlanned,
        defaultRemainingMode: parsed.data.defaultRemainingMode,
        categories: {
          create: lines.map((line, index) => ({
            projectId: ctx.project.id,
            categoryId: line.categoryId,
            label: line.label,
            plannedAmount: line.plannedAmount,
            sortOrder: index,
            notes: line.notes,
          })),
        },
      },
    });

    // Keep project estimatedBudget in sync with planned total when override set or sum
    const plannedSum = lines.reduce((s, l) => s + l.plannedAmount, 0);
    await prisma.project.update({
      where: { id: ctx.project.id },
      data: { estimatedBudget: totalPlanned ?? plannedSum },
    });

    logger.info("Budget updated", {
      projectId: ctx.project.id,
      budgetId: budget.id,
      actorId: ctx.user.id,
    });

    await recordAuditEvent({
      projectId: ctx.project.id,
      actorId: ctx.user.id,
      action: "UPDATE",
      entityType: "Budget",
      entityId: budget.id,
      metadata: { lineCount: lines.length, totalPlanned },
      activity: {
        message: `${actorLabel(ctx.user)} updated the project budget.`,
        href: `/p/${slug}/budget`,
      },
    });

    return budget;
  }

  const budget = await prisma.budget.create({
    data: {
      projectId: ctx.project.id,
      name: parsed.data.name,
      currency: ctx.project.currency || "INR",
      totalPlanned,
      notes: parsed.data.notes || null,
      defaultRemainingMode: parsed.data.defaultRemainingMode,
      status: "ACTIVE",
      createdById: ctx.user.id,
      categories: {
        create: lines.map((line, index) => ({
          projectId: ctx.project.id,
          categoryId: line.categoryId,
          label: line.label,
          plannedAmount: line.plannedAmount,
          sortOrder: index,
          notes: line.notes,
        })),
      },
    },
  });

  const plannedSum = lines.reduce((s, l) => s + l.plannedAmount, 0);
  await prisma.project.update({
    where: { id: ctx.project.id },
    data: { estimatedBudget: totalPlanned ?? plannedSum },
  });

  logger.info("Budget created", {
    projectId: ctx.project.id,
    budgetId: budget.id,
    actorId: ctx.user.id,
  });

  await recordAuditEvent({
    projectId: ctx.project.id,
    actorId: ctx.user.id,
    action: "CREATE",
    entityType: "Budget",
    entityId: budget.id,
    metadata: { lineCount: lines.length, totalPlanned },
    activity: {
      message: `${actorLabel(ctx.user)} created the project budget.`,
      href: `/p/${slug}/budget`,
    },
  });

  return budget;
}
