export type LoanStatementRow = {
  loanNumber: string;
  type: string;
  amount: number;
  transactionDate: Date;
  paidTo?: string | null;
  paymentMethod?: string | null;
  referenceNumber?: string | null;
  description?: string | null;
  rotationalStatus?: string | null;
};

export type LoanStatementData = {
  projectName: string;
  lenderName?: string | null;
  periodLabel: string;
  year: number;
  month: number;
  generatedAt: Date;
  balances: {
    sanctioned: number;
    disbursed: number;
    spentConstruction: number;
    diverted: number;
    repaidRotational: number;
    openRotational: number;
    available: number;
  };
  periodTotals: {
    disbursed: number;
    construction: number;
    diverted: number;
    repaid: number;
  };
  rows: LoanStatementRow[];
};

export function loanStatementPdfFileName(
  projectName: string,
  year: number,
  month: number,
): string {
  const project = projectName
    .replace(/[^\w\- ]+/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 40);
  const mm = String(month).padStart(2, "0");
  return `${project || "Kavin-Illam"}-Loan-Statement-${year}-${mm}.pdf`;
}

export function loanTypeLabel(type: string): string {
  switch (type) {
    case "DISBURSEMENT":
      return "Disbursement";
    case "DEBIT_CONSTRUCTION":
      return "Construction debit";
    case "DEBIT_OTHER":
      return "Rotational debit";
    case "CREDIT_REPAYMENT":
      return "Repayment";
    default:
      return type;
  }
}
