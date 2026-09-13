import type { Visibility } from "@prisma/client";

import { AppError } from "@/lib/errors";
import { recordAuditEvent } from "@/server/audit/record";
import {
  canViewResource,
  includeInSharedProjectTotals,
  requireProjectPermissionBySlug,
  roleHasPermission,
  type Permission,
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

import { paiseToCsvRupees, rowsToCsv } from "./csv";

export const REPORT_IDS = [
  "summary",
  "expenses",
  "category",
  "monthly",
  "advances",
  "payment-requests",
  "budget-vs-actual",
  "cash-flow",
  "outstanding",
  "documents",
] as const;

export type ReportId = (typeof REPORT_IDS)[number];

export type ReportDefinition = {
  id: ReportId;
  title: string;
  description: string;
  permission: Permission;
};

export const REPORT_CATALOG: readonly ReportDefinition[] = [
  {
    id: "summary",
    title: "Project summary",
    description: "High-level shared finance totals.",
    permission: "FINANCE_VIEW",
  },
  {
    id: "expenses",
    title: "Expense register",
    description: "Authorized expense and advance ledger rows.",
    permission: "FINANCE_VIEW",
  },
  {
    id: "category",
    title: "Category spend",
    description: "Shared spend rolled up by category.",
    permission: "FINANCE_VIEW",
  },
  {
    id: "monthly",
    title: "Monthly cash flow",
    description: "Income and expense by calendar month (Asia/Kolkata).",
    permission: "FINANCE_VIEW",
  },
  {
    id: "advances",
    title: "Advances",
    description: "Advance principal, settlements, and outstanding.",
    permission: "FINANCE_VIEW",
  },
  {
    id: "payment-requests",
    title: "Payment requests",
    description: "Request status, amounts, and paid totals.",
    permission: "FINANCE_VIEW",
  },
  {
    id: "budget-vs-actual",
    title: "Budget vs actual",
    description: "Planned, committed, paid, and remaining by line.",
    permission: "BUDGET_VIEW",
  },
  {
    id: "cash-flow",
    title: "Cash flow",
    description: "Shared income, expenses, and net.",
    permission: "FINANCE_VIEW",
  },
  {
    id: "outstanding",
    title: "Outstanding advances",
    description: "Open advance balances only.",
    permission: "FINANCE_VIEW",
  },
  {
    id: "documents",
    title: "Document register",
    description: "Active documents with category and expiry.",
    permission: "DOCUMENT_VIEW",
  },
] as const;

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

function isReportId(value: string): value is ReportId {
  return (REPORT_IDS as readonly string[]).includes(value);
}

export function getReportDefinition(reportId: string): ReportDefinition {
  if (!isReportId(reportId)) {
    throw new AppError("NOT_FOUND", "Report was not found.");
  }
  const def = REPORT_CATALOG.find((r) => r.id === reportId);
  if (!def) {
    throw new AppError("NOT_FOUND", "Report was not found.");
  }
  return def;
}

function monthKeyKolkata(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
  }).format(date);
}

export type BuiltReport = {
  filename: string;
  csv: string;
  rowCount: number;
};

export async function buildReportCsv(
  slug: string,
  reportId: string,
): Promise<BuiltReport> {
  const def = getReportDefinition(reportId);
  const ctx = await requireProjectPermissionBySlug(slug, def.permission);
  const viewer = { userId: ctx.user.id, role: ctx.role };
  const projectId = ctx.project.id;
  const code = ctx.project.slug;

  const report: BuiltReport = await (async () => {
    switch (def.id) {
      case "summary":
      case "cash-flow": {
        const txs = await prisma.financialTransaction.findMany({
          where: { projectId, deletedAt: null },
          select: {
            projectId: true,
            type: true,
            direction: true,
            amount: true,
            status: true,
            visibility: true,
            createdById: true,
            allowedUserIds: true,
            deletedAt: true,
          },
        });
        const shared = txs.filter(
          (row) =>
            canViewResource(viewer, toVisibleResource(row), projectId) &&
            includeInSharedProjectTotals(toVisibleResource(row)),
        );
        const totals = sumAuthorizedFinanceTotals(shared);
        const headers = ["metric", "amount_inr"];
        const rows = [
          ["total_income", paiseToCsvRupees(totals.totalIncome)],
          ["total_expenses", paiseToCsvRupees(totals.totalExpenses)],
          ["total_advances", paiseToCsvRupees(totals.totalAdvances)],
          ["net_cash_flow", paiseToCsvRupees(totals.netCashFlow)],
          ["paid_count", totals.paidCount],
        ] as const;
        return {
          filename: `${code}-${def.id}.csv`,
          csv: rowsToCsv(headers, rows),
          rowCount: rows.length,
        };
      }

      case "expenses": {
        const txs = await prisma.financialTransaction.findMany({
          where: {
            projectId,
            deletedAt: null,
            type: { in: ["EXPENSE", "ADVANCE"] },
          },
          orderBy: { transactionDate: "desc" },
          include: { category: { select: { name: true, code: true } } },
        });
        const authorized = txs.filter((row) =>
          canViewResource(viewer, toVisibleResource(row), projectId),
        );
        const headers = [
          "date",
          "number",
          "type",
          "category",
          "amount_inr",
          "status",
          "visibility",
          "paid_to",
          "description",
        ];
        const rows = authorized.map((tx) => [
          tx.transactionDate.toISOString().slice(0, 10),
          tx.transactionNumber,
          tx.type,
          tx.category?.name ?? "",
          paiseToCsvRupees(tx.amount),
          tx.status,
          tx.visibility,
          tx.paidTo ?? "",
          tx.description ?? "",
        ]);
        return {
          filename: `${code}-expenses.csv`,
          csv: rowsToCsv(headers, rows),
          rowCount: rows.length,
        };
      }

      case "category": {
        const txs = await prisma.financialTransaction.findMany({
          where: {
            projectId,
            deletedAt: null,
            status: { in: ["PAID", "PARTIALLY_PAID", "APPROVED"] },
          },
          include: {
            category: { select: { id: true, name: true, code: true } },
          },
        });
        const shared = txs.filter(
          (row) =>
            canViewResource(viewer, toVisibleResource(row), projectId) &&
            includeInSharedProjectTotals(toVisibleResource(row)) &&
            isBudgetConsumingLedgerType(row.type),
        );
        const byCat = new Map<
          string,
          { name: string; code: string; amount: number }
        >();
        for (const tx of shared) {
          const key = tx.categoryId ?? "__none__";
          const existing = byCat.get(key);
          if (existing) {
            existing.amount += tx.amount;
          } else {
            byCat.set(key, {
              name: tx.category?.name ?? "Uncategorized",
              code: tx.category?.code ?? "",
              amount: tx.amount,
            });
          }
        }
        const sorted = [...byCat.values()].sort((a, b) => b.amount - a.amount);
        const headers = ["category", "code", "amount_inr"];
        const rows = sorted.map((row) => [
          row.name,
          row.code,
          paiseToCsvRupees(row.amount),
        ]);
        return {
          filename: `${code}-category.csv`,
          csv: rowsToCsv(headers, rows),
          rowCount: rows.length,
        };
      }

      case "monthly": {
        const txs = await prisma.financialTransaction.findMany({
          where: {
            projectId,
            deletedAt: null,
            status: { in: ["PAID", "PARTIALLY_PAID", "APPROVED"] },
          },
          select: {
            projectId: true,
            type: true,
            direction: true,
            amount: true,
            status: true,
            visibility: true,
            createdById: true,
            allowedUserIds: true,
            deletedAt: true,
            transactionDate: true,
          },
        });
        const shared = txs.filter(
          (row) =>
            canViewResource(viewer, toVisibleResource(row), projectId) &&
            includeInSharedProjectTotals(toVisibleResource(row)),
        );
        const months = new Map<string, { income: number; expense: number }>();
        for (const tx of shared) {
          const key = monthKeyKolkata(tx.transactionDate);
          const bucket = months.get(key) ?? { income: 0, expense: 0 };
          if (tx.type === "INCOME" || tx.direction === "INFLOW") {
            bucket.income += tx.amount;
          }
          if (
            tx.type === "EXPENSE" ||
            tx.type === "ADVANCE" ||
            (tx.direction === "OUTFLOW" &&
              tx.type !== "TRANSFER" &&
              tx.type !== "SETTLEMENT")
          ) {
            bucket.expense += tx.amount;
          }
          months.set(key, bucket);
        }
        const headers = ["month", "income_inr", "expense_inr", "net_inr"];
        const rows = [...months.entries()]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([month, bucket]) => [
            month,
            paiseToCsvRupees(bucket.income),
            paiseToCsvRupees(bucket.expense),
            paiseToCsvRupees(bucket.income - bucket.expense),
          ]);
        return {
          filename: `${code}-monthly.csv`,
          csv: rowsToCsv(headers, rows),
          rowCount: rows.length,
        };
      }

      case "advances":
      case "outstanding": {
        const advances = await prisma.advance.findMany({
          where: { projectId, deletedAt: null },
          include: {
            settlements: {
              where: { deletedAt: null },
              select: { kind: true, amount: true, deletedAt: true },
            },
          },
          orderBy: { issuedAt: "desc" },
        });
        const authorized = advances.filter((row) =>
          canViewResource(viewer, toVisibleResource(row), projectId),
        );
        const headers = [
          "number",
          "recipient",
          "issued_on",
          "original_inr",
          "settled_inr",
          "refunded_inr",
          "outstanding_inr",
          "status",
          "visibility",
        ];
        let rows = authorized.map((advance) => {
          const breakdown = computeAdvanceOutstanding(
            advance.originalAmount,
            advance.settlements,
          );
          const status =
            advance.status === "CANCELLED"
              ? "CANCELLED"
              : deriveAdvanceStatus({
                  originalAmount: advance.originalAmount,
                  outstanding: breakdown.outstanding,
                });
          return {
            advance,
            breakdown,
            status,
          };
        });
        if (def.id === "outstanding") {
          rows = rows.filter((r) => r.breakdown.outstanding > 0);
        }
        const csvRows = rows.map(({ advance, breakdown, status }) => [
          advance.advanceNumber,
          advance.recipientName ?? "",
          advance.issuedAt.toISOString().slice(0, 10),
          paiseToCsvRupees(breakdown.originalAmount),
          paiseToCsvRupees(breakdown.settledAmount),
          paiseToCsvRupees(breakdown.refundedAmount),
          paiseToCsvRupees(breakdown.outstanding),
          status,
          advance.visibility,
        ]);
        return {
          filename: `${code}-${def.id}.csv`,
          csv: rowsToCsv(headers, csvRows),
          rowCount: csvRows.length,
        };
      }

      case "payment-requests": {
        const requests = await prisma.paymentRequest.findMany({
          where: { projectId, deletedAt: null },
          orderBy: { createdAt: "desc" },
          include: { category: { select: { name: true } } },
        });
        const authorized = requests.filter((row) =>
          canViewResource(viewer, toVisibleResource(row), projectId),
        );
        const headers = [
          "number",
          "title",
          "status",
          "amount_inr",
          "paid_inr",
          "open_commitment_inr",
          "category",
          "visibility",
          "created_at",
        ];
        const rows = authorized.map((req) => [
          req.requestNumber,
          req.title,
          req.status,
          paiseToCsvRupees(req.amount),
          paiseToCsvRupees(req.paidAmount),
          paiseToCsvRupees(
            openCommitmentFromRequest({
              status: req.status,
              amount: req.amount,
              paidAmount: req.paidAmount,
            }),
          ),
          req.category?.name ?? "",
          req.visibility,
          req.createdAt.toISOString(),
        ]);
        return {
          filename: `${code}-payment-requests.csv`,
          csv: rowsToCsv(headers, rows),
          rowCount: rows.length,
        };
      }

      case "budget-vs-actual": {
        const [budget, txs, requests] = await Promise.all([
          prisma.budget.findFirst({
            where: { projectId, status: "ACTIVE" },
            include: {
              categories: {
                orderBy: { sortOrder: "asc" },
                select: {
                  categoryId: true,
                  label: true,
                  plannedAmount: true,
                },
              },
            },
          }),
          prisma.financialTransaction.findMany({
            where: {
              projectId,
              deletedAt: null,
              status: { in: ["PAID", "PARTIALLY_PAID", "APPROVED"] },
            },
            select: {
              projectId: true,
              type: true,
              amount: true,
              categoryId: true,
              visibility: true,
              createdById: true,
              allowedUserIds: true,
              deletedAt: true,
              status: true,
            },
          }),
          prisma.paymentRequest.findMany({
            where: { projectId, deletedAt: null },
            select: {
              projectId: true,
              status: true,
              amount: true,
              paidAmount: true,
              categoryId: true,
              visibility: true,
              createdById: true,
              allowedUserIds: true,
              deletedAt: true,
            },
          }),
        ]);

        const sharedTx = txs.filter(
          (row) =>
            canViewResource(viewer, toVisibleResource(row), projectId) &&
            includeInSharedProjectTotals(toVisibleResource(row)),
        );
        const sharedReq = requests.filter(
          (row) =>
            canViewResource(viewer, toVisibleResource(row), projectId) &&
            includeInSharedProjectTotals(toVisibleResource(row)),
        );

        const rollup = computeBudgetRollup({
          lines: (budget?.categories ?? []).map((line) => ({
            categoryId: line.categoryId,
            label: line.label,
            plannedAmount: line.plannedAmount,
          })),
          totalPlannedOverride:
            budget?.totalPlanned ?? ctx.project.estimatedBudget ?? null,
          paid: sharedTx
            .filter((row) => isBudgetConsumingLedgerType(row.type))
            .map((row) => ({ categoryId: row.categoryId, amount: row.amount })),
          commitments: sharedReq
            .map((row) => ({
              categoryId: row.categoryId,
              amount: openCommitmentFromRequest({
                status: row.status,
                amount: row.amount,
                paidAmount: row.paidAmount,
              }),
            }))
            .filter((s) => s.amount > 0),
        });

        const headers = [
          "line",
          "planned_inr",
          "committed_inr",
          "paid_inr",
          "remaining_vs_paid_inr",
          "remaining_vs_committed_inr",
          "variance_paid_inr",
        ];
        const rows = [
          ...rollup.lines.map((line) => [
            line.label,
            paiseToCsvRupees(line.planned),
            paiseToCsvRupees(line.committed),
            paiseToCsvRupees(line.paid),
            paiseToCsvRupees(line.remainingVsPaid),
            paiseToCsvRupees(line.remainingVsCommitted),
            paiseToCsvRupees(line.variancePaid),
          ]),
          [
            "TOTAL",
            paiseToCsvRupees(rollup.totals.planned),
            paiseToCsvRupees(rollup.totals.committed),
            paiseToCsvRupees(rollup.totals.paid),
            paiseToCsvRupees(rollup.totals.remainingVsPaid),
            paiseToCsvRupees(rollup.totals.remainingVsCommitted),
            paiseToCsvRupees(rollup.totals.variancePaid),
          ],
        ];
        return {
          filename: `${code}-budget-vs-actual.csv`,
          csv: rowsToCsv(headers, rows),
          rowCount: rows.length,
        };
      }

      case "documents": {
        const docs = await prisma.document.findMany({
          where: { projectId, status: "ACTIVE" },
          orderBy: { updatedAt: "desc" },
        });
        const authorized = docs.filter((row) =>
          canViewResource(viewer, toVisibleResource(row), projectId),
        );
        const headers = [
          "number",
          "title",
          "category",
          "version",
          "file_name",
          "visibility",
          "expiry_date",
          "updated_at",
        ];
        const rows = authorized.map((doc) => [
          doc.documentNumber,
          doc.title,
          doc.category,
          doc.currentVersion,
          doc.fileName,
          doc.visibility,
          doc.expiryDate ? doc.expiryDate.toISOString().slice(0, 10) : "",
          doc.updatedAt.toISOString(),
        ]);
        return {
          filename: `${code}-documents.csv`,
          csv: rowsToCsv(headers, rows),
          rowCount: rows.length,
        };
      }

      default: {
        const _exhaustive: never = def.id;
        throw new AppError("NOT_FOUND", `Unhandled report: ${_exhaustive}`);
      }
    }
  })();

  await recordAuditEvent({
    projectId: ctx.project.id,
    actorId: ctx.user.id,
    action: "EXPORT",
    entityType: "Report",
    entityId: def.id,
    metadata: {
      reportId: def.id,
      filename: report.filename,
      rowCount: report.rowCount,
    },
  });

  return report;
}

export async function listAvailableReports(slug: string) {
  const ctx = await requireProjectPermissionBySlug(slug, "PROJECT_VIEW");
  const reports = REPORT_CATALOG.filter((report) =>
    roleHasPermission(ctx.role, report.permission),
  );
  return { project: ctx.project, role: ctx.role, reports };
}
