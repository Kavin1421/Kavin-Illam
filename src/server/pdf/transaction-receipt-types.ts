export type ReceiptParty = {
  name?: string | null;
  email?: string | null;
};

export type ReceiptProof = {
  id: string;
  title: string;
  documentNumber: string;
  fileName: string;
  mimeType?: string | null;
} | null;

export type TransactionReceiptData = {
  projectName: string;
  projectType: string;
  transaction: {
    transactionNumber: string;
    type: string;
    status: string;
    amount: number;
    currency: string;
    paidTo?: string | null;
    paymentMethod?: string | null;
    referenceNumber?: string | null;
    description?: string | null;
    notes?: string | null;
    transactionDate: Date;
    createdAt: Date;
    categoryName?: string | null;
    accountName?: string | null;
    createdBy: ReceiptParty;
    paidBy?: ReceiptParty | null;
    proofDocument?: ReceiptProof;
  };
  generatedAt: Date;
};

export function receiptKindLabel(type: string): string {
  switch (type.toUpperCase()) {
    case "EXPENSE":
      return "Expense receipt";
    case "ADVANCE":
      return "Payment receipt";
    case "SETTLEMENT":
      return "Settlement receipt";
    case "INCOME":
      return "Income receipt";
    case "REFUND":
      return "Refund receipt";
    case "TRANSFER":
      return "Transfer receipt";
    case "ADJUSTMENT":
      return "Adjustment receipt";
    default:
      return "Payment receipt";
  }
}

export function amountSectionLabel(type: string): string {
  switch (type.toUpperCase()) {
    case "INCOME":
    case "REFUND":
      return "Amount received";
    case "TRANSFER":
      return "Amount transferred";
    case "ADJUSTMENT":
      return "Adjustment amount";
    default:
      return "Amount paid";
  }
}

export function typeDisplayLabel(type: string): string {
  return type.replaceAll("_", " ");
}

export function methodDisplayLabel(method?: string | null): string {
  if (!method) return "—";
  return method.replaceAll("_", " ");
}

/** Filename stem without .pdf — sanitized for Content-Disposition. */
export function receiptPdfFileName(
  projectName: string,
  type: string,
  transactionNumber: string,
): string {
  const project = projectName
    .replace(/[^\w\- ]+/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 40);
  const kind = (() => {
    switch (type.toUpperCase()) {
      case "EXPENSE":
        return "Expense-Receipt";
      case "ADVANCE":
        return "Payment-Receipt";
      case "SETTLEMENT":
        return "Settlement-Receipt";
      case "INCOME":
        return "Income-Receipt";
      case "REFUND":
        return "Refund-Receipt";
      case "TRANSFER":
        return "Transfer-Receipt";
      default:
        return "Payment-Receipt";
    }
  })();
  const id = transactionNumber.replace(/[^\w\-]+/g, "-");
  return `${project || "Kavin-Illam"}-${kind}-${id}.pdf`;
}

export function typeAccentColor(type: string): string {
  switch (type.toUpperCase()) {
    case "ADVANCE":
      return "#8B5CF6";
    case "INCOME":
    case "REFUND":
      return "#0891B2";
    case "TRANSFER":
      return "#3B82F6";
    case "SETTLEMENT":
      return "#00A86B";
    default:
      return "#00A86B";
  }
}

export function statusBadgeColors(status: string): {
  bg: string;
  text: string;
  border: string;
} {
  const value = status.toUpperCase();
  if (value === "PAID" || value === "APPROVED") {
    return { bg: "#ECFDF5", text: "#008F62", border: "#A7F3D0" };
  }
  if (value === "PENDING" || value === "DRAFT" || value === "PARTIALLY_PAID") {
    return { bg: "#FFFBEB", text: "#B45309", border: "#FDE68A" };
  }
  if (value === "CANCELLED" || value === "REJECTED") {
    return { bg: "#FEF2F2", text: "#B91C1C", border: "#FECACA" };
  }
  if (value === "REFUNDED") {
    return { bg: "#ECFEFF", text: "#0E7490", border: "#A5F3FC" };
  }
  return { bg: "#F8FAFC", text: "#475569", border: "#E2E8F0" };
}
