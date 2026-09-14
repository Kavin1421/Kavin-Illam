import { renderToBuffer } from "@react-pdf/renderer";

import { logger } from "@/lib/logger";
import { getTransaction } from "@/server/finance/transactions";

import { TransactionReceiptDocument } from "./transaction-receipt-document";
import {
  receiptPdfFileName,
  type TransactionReceiptData,
} from "./transaction-receipt-types";

export type GeneratedTransactionReceipt = {
  bytes: Buffer;
  fileName: string;
  contentType: "application/pdf";
  transactionNumber: string;
};

function toReceiptData(
  project: { name: string; projectType: string },
  transaction: Awaited<ReturnType<typeof getTransaction>>["transaction"],
): TransactionReceiptData {
  return {
    projectName: project.name,
    projectType: project.projectType,
    generatedAt: new Date(),
    transaction: {
      transactionNumber: transaction.transactionNumber,
      type: transaction.type,
      status: transaction.status,
      amount: transaction.amount,
      currency: transaction.currency,
      paidTo: transaction.paidTo,
      paymentMethod: transaction.paymentMethod,
      referenceNumber: transaction.referenceNumber,
      description: transaction.description,
      notes: transaction.notes,
      transactionDate: transaction.transactionDate,
      createdAt: transaction.createdAt,
      categoryName: transaction.category?.name ?? null,
      accountName: transaction.account?.name ?? null,
      createdBy: {
        name: transaction.createdBy.name,
        email: transaction.createdBy.email,
      },
      paidBy: transaction.paidBy
        ? {
            name: transaction.paidBy.name,
            email: transaction.paidBy.email,
          }
        : null,
      proofDocument: transaction.proofDocument
        ? {
            id: transaction.proofDocument.id,
            title: transaction.proofDocument.title,
            documentNumber: transaction.proofDocument.documentNumber,
            fileName: transaction.proofDocument.fileName,
            mimeType: transaction.proofDocument.mimeType,
          }
        : null,
    },
  };
}

/**
 * Authorize + load transaction, then render a standalone A4 PDF receipt.
 * Uses the same auth path as the transaction detail page.
 */
export async function generateTransactionReceiptPdf(
  slug: string,
  transactionId: string,
): Promise<GeneratedTransactionReceipt> {
  const { project, transaction } = await getTransaction(slug, transactionId);
  const data = toReceiptData(project, transaction);

  const bytes = await renderToBuffer(
    <TransactionReceiptDocument data={data} />,
  );

  const fileName = receiptPdfFileName(
    project.name,
    transaction.type,
    transaction.transactionNumber,
  );

  logger.info("Transaction receipt PDF generated", {
    slug,
    transactionId,
    transactionNumber: transaction.transactionNumber,
    bytes: bytes.byteLength,
  });

  return {
    bytes: Buffer.from(bytes),
    fileName,
    contentType: "application/pdf",
    transactionNumber: transaction.transactionNumber,
  };
}
