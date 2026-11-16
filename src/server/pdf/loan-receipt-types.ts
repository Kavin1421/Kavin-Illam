export type LoanReceiptData = {
  projectName: string;
  lenderName?: string | null;
  sanctionedAmount: number;
  generatedAt: Date;
  transaction: {
    loanNumber: string;
    type: string;
    amount: number;
    currency: string;
    paidTo?: string | null;
    paymentMethod?: string | null;
    referenceNumber?: string | null;
    description?: string | null;
    notes?: string | null;
    transactionDate: Date;
    createdAt: Date;
    recordedBy: string;
    repaid?: number;
    outstanding?: number;
    rotationalStatus?: string | null;
    linkedDebit?: {
      loanNumber: string;
      amount: number;
      description?: string | null;
      paidTo?: string | null;
    } | null;
    repayments?: Array<{
      loanNumber: string;
      amount: number;
      transactionDate: Date;
    }>;
  };
};

export function loanReceiptTitle(type: string): string {
  switch (type) {
    case "DISBURSEMENT":
      return "Loan disbursement";
    case "DEBIT_CONSTRUCTION":
      return "Construction debit";
    case "DEBIT_OTHER":
      return "Rotational debit";
    case "CREDIT_REPAYMENT":
      return "Rotational repayment";
    default:
      return "Loan receipt";
  }
}

export function loanReceiptPdfFileName(
  projectName: string,
  type: string,
  loanNumber: string,
): string {
  const project = projectName
    .replace(/[^\w\- ]+/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 40);
  const kind = (() => {
    switch (type) {
      case "DISBURSEMENT":
        return "Loan-Disbursement";
      case "DEBIT_CONSTRUCTION":
        return "Loan-Construction-Debit";
      case "DEBIT_OTHER":
        return "Loan-Rotational-Debit";
      case "CREDIT_REPAYMENT":
        return "Loan-Repayment";
      default:
        return "Loan-Receipt";
    }
  })();
  const id = loanNumber.replace(/[^\w\-]+/g, "-");
  return `${project || "Kavin-Illam"}-${kind}-${id}.pdf`;
}
