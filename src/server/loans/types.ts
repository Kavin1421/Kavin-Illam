import type { LoanFacility, LoanTransaction, Prisma } from "@prisma/client";

import type { RotationalStatus } from "@/server/loans/math";

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
} satisfies Prisma.LoanTransactionInclude;

export type LoanTxnListItem = Prisma.LoanTransactionGetPayload<{
  include: typeof loanTxnListInclude;
}>;

export type LoanLedgerRow = LoanTxnListItem & {
  repaid: number;
  outstanding: number;
  rotationalStatus: RotationalStatus | null;
};

export type LoanTxnDetail = LoanTransaction & {
  createdBy: { id: string; name: string | null; email: string | null };
  linkedDebit: {
    id: string;
    loanNumber: string;
    amount: number;
    description: string | null;
    paidTo: string | null;
    transactionDate: Date;
    type: LoanTransaction["type"];
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

export type { LoanFacility };
