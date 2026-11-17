import { renderToBuffer } from "@react-pdf/renderer";

import { formatDateInput } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { getLoanOverview } from "@/server/loans/service";

import { LoanStatementDocument } from "./loan-statement-document";
import {
  loanStatementPdfFileName,
  type LoanStatementData,
} from "./loan-statement-types";

export type GeneratedLoanStatement = {
  bytes: Buffer;
  fileName: string;
  contentType: "application/pdf";
};

function monthBounds(year: number, month: number): { start: Date; end: Date } {
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new AppError("VALIDATION", "Invalid statement year.");
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new AppError("VALIDATION", "Invalid statement month.");
  }
  // Asia/Kolkata calendar month as UTC instants via +05:30 walls.
  const start = new Date(
    Date.parse(
      `${year}-${String(month).padStart(2, "0")}-01T00:00:00+05:30`,
    ),
  );
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const end = new Date(
    Date.parse(
      `${nextYear}-${String(nextMonth).padStart(2, "0")}-01T00:00:00+05:30`,
    ),
  );
  return { start, end };
}

function periodLabel(year: number, month: number): string {
  const sample = new Date(Date.UTC(year, month - 1, 15));
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    month: "long",
    year: "numeric",
  }).format(sample);
}

export async function generateLoanStatementPdf(
  slug: string,
  year: number,
  month: number,
): Promise<GeneratedLoanStatement> {
  const { project, facility, balances, transactions } =
    await getLoanOverview(slug);
  if (!facility || !balances) {
    throw new AppError("NOT_FOUND", "Home Loan facility was not found.");
  }

  const { start, end } = monthBounds(year, month);
  const rows = transactions
    .filter((row) => {
      const t = row.transactionDate.getTime();
      return t >= start.getTime() && t < end.getTime();
    })
    .sort(
      (a, b) => a.transactionDate.getTime() - b.transactionDate.getTime(),
    );

  const periodTotals = {
    disbursed: 0,
    construction: 0,
    diverted: 0,
    repaid: 0,
  };
  for (const row of rows) {
    if (row.type === "DISBURSEMENT") periodTotals.disbursed += row.amount;
    if (row.type === "DEBIT_CONSTRUCTION")
      periodTotals.construction += row.amount;
    if (row.type === "DEBIT_OTHER") periodTotals.diverted += row.amount;
    if (row.type === "CREDIT_REPAYMENT") periodTotals.repaid += row.amount;
  }

  const data: LoanStatementData = {
    projectName: project.name,
    lenderName: facility.lenderName,
    periodLabel: periodLabel(year, month),
    year,
    month,
    generatedAt: new Date(),
    balances: {
      sanctioned: balances.sanctioned,
      disbursed: balances.disbursed,
      spentConstruction: balances.spentConstruction,
      diverted: balances.diverted,
      repaidRotational: balances.repaidRotational,
      openRotational: balances.openRotational,
      available: balances.available,
    },
    periodTotals,
    rows: rows.map((row) => ({
      loanNumber: row.loanNumber,
      type: row.type,
      amount: row.amount,
      transactionDate: row.transactionDate,
      paidTo: row.paidTo,
      paymentMethod: row.paymentMethod,
      referenceNumber: row.referenceNumber,
      description: row.description,
      rotationalStatus: row.rotationalStatus,
    })),
  };

  const bytes = await renderToBuffer(
    <LoanStatementDocument data={data} /> as Parameters<
      typeof renderToBuffer
    >[0],
  );

  const fileName = loanStatementPdfFileName(project.name, year, month);
  logger.info("Loan statement PDF generated", {
    slug,
    year,
    month,
    rows: rows.length,
    bytes: bytes.byteLength,
    asOf: formatDateInput(new Date()),
  });

  return {
    bytes: Buffer.from(bytes),
    fileName,
    contentType: "application/pdf",
  };
}
