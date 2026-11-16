import type { RotationalStatus } from "@/server/loans/math";

/** Explicit shapes so the IDE does not need fresh Prisma.*Delegate exports. */

export type LoanFacility = {
  id: string;
  projectId: string;
  kind: string;
  lenderName: string | null;
  sanctionedAmount: number;
  interestRateBps: number | null;
  tenureMonths: number | null;
  currency: string;
  status: string;
  notes: string | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  deletedById: string | null;
};

export type LoanTxnListItem = {
  id: string;
  projectId: string;
  facilityId: string;
  loanNumber: string;
  type: string;
  amount: number;
  currency: string;
  transactionDate: Date;
  paidTo: string | null;
  paymentMethod: string | null;
  referenceNumber: string | null;
  description: string | null;
  notes: string | null;
  linkedDebitId: string | null;
  proofDocumentId: string | null;
  proofDocumentIds: string[];
  visibility: "PRIVATE" | "PROJECT_SHARED" | "RESTRICTED";
  allowedUserIds: string[];
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  deletedById: string | null;
  deletionReason: string | null;
  createdBy: { id: string; name: string | null; email: string | null };
  linkedDebit: {
    id: string;
    loanNumber: string;
    amount: number;
    description: string | null;
    paidTo: string | null;
  } | null;
};

export type LoanLedgerRow = LoanTxnListItem & {
  repaid: number;
  outstanding: number;
  rotationalStatus: RotationalStatus | null;
};

export type LoanTxnDetail = LoanTxnListItem & {
  linkedDebit: {
    id: string;
    loanNumber: string;
    amount: number;
    description: string | null;
    paidTo: string | null;
    transactionDate: Date;
    type: string;
  } | null;
  repayments: Array<{
    id: string;
    loanNumber: string;
    amount: number;
    transactionDate: Date;
    description: string | null;
  }>;
  proofDocument: {
    id: string;
    title: string;
    documentNumber: string;
    fileName: string;
    mimeType: string | null;
  } | null;
  repaid: number;
  outstanding: number;
  rotationalStatus: RotationalStatus | null;
};

/** Shared include object for list queries (runtime only). */
export const loanTxnListInclude = {
  createdBy: { select: { id: true, name: true, email: true } },
  linkedDebit: {
    select: {
      id: true,
      loanNumber: true,
      amount: true,
      description: true,
      paidTo: true,
    },
  },
} as const;
