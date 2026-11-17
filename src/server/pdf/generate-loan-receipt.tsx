import { renderToBuffer } from "@react-pdf/renderer";

import { logger } from "@/lib/logger";
import { absoluteUrl } from "@/server/email/send";
import { getLoanTransaction } from "@/server/loans/service";

import { LoanReceiptDocument } from "./loan-receipt-document";
import {
  loanReceiptPdfFileName,
  type LoanReceiptData,
} from "./loan-receipt-types";

export type GeneratedLoanReceipt = {
  bytes: Buffer;
  fileName: string;
  contentType: "application/pdf";
  loanNumber: string;
};

function proofHref(slug: string, documentId: string): string {
  return absoluteUrl(`/p/${slug}/documents/${documentId}`);
}

function toReceiptData(
  slug: string,
  projectName: string,
  facility: { lenderName?: string | null; sanctionedAmount: number },
  transaction: Awaited<
    ReturnType<typeof getLoanTransaction>
  >["transaction"],
): LoanReceiptData {
  const proofs =
    transaction.proofDocuments && transaction.proofDocuments.length > 0
      ? transaction.proofDocuments
      : transaction.proofDocument
        ? [transaction.proofDocument]
        : [];

  return {
    projectName,
    lenderName: facility.lenderName,
    sanctionedAmount: facility.sanctionedAmount,
    generatedAt: new Date(),
    transaction: {
      loanNumber: transaction.loanNumber,
      type: transaction.type,
      amount: transaction.amount,
      currency: transaction.currency,
      paidTo: transaction.paidTo,
      paymentMethod: transaction.paymentMethod,
      referenceNumber: transaction.referenceNumber,
      description: transaction.description,
      notes: transaction.notes,
      transactionDate: transaction.transactionDate,
      createdAt: transaction.createdAt,
      recordedBy:
        transaction.createdBy.name ||
        transaction.createdBy.email ||
        "—",
      repaid: transaction.repaid,
      outstanding: transaction.outstanding,
      rotationalStatus: transaction.rotationalStatus,
      linkedDebit: transaction.linkedDebit
        ? {
            loanNumber: transaction.linkedDebit.loanNumber,
            amount: transaction.linkedDebit.amount,
            description: transaction.linkedDebit.description,
            paidTo: transaction.linkedDebit.paidTo,
          }
        : null,
      repayments: (transaction.repayments ?? []).map((row) => ({
        loanNumber: row.loanNumber,
        amount: row.amount,
        transactionDate: row.transactionDate,
      })),
      proofDocuments: proofs.map((doc) => ({
        id: doc.id,
        title: doc.title,
        documentNumber: doc.documentNumber,
        fileName: doc.fileName,
        mimeType: doc.mimeType,
        href: proofHref(slug, doc.id),
      })),
    },
  };
}

export async function generateLoanReceiptPdf(
  slug: string,
  transactionId: string,
): Promise<GeneratedLoanReceipt> {
  const { project, facility, transaction } = await getLoanTransaction(
    slug,
    transactionId,
  );
  const data = toReceiptData(slug, project.name, facility, transaction);

  const bytes = await renderToBuffer(
    <LoanReceiptDocument data={data} /> as Parameters<
      typeof renderToBuffer
    >[0],
  );

  const fileName = loanReceiptPdfFileName(
    project.name,
    transaction.type,
    transaction.loanNumber,
  );

  logger.info("Loan receipt PDF generated", {
    slug,
    transactionId,
    loanNumber: transaction.loanNumber,
    bytes: bytes.byteLength,
  });

  return {
    bytes: Buffer.from(bytes),
    fileName,
    contentType: "application/pdf",
    loanNumber: transaction.loanNumber,
  };
}
