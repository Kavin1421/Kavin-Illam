import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LoanTransactionForm } from "@/components/loans/loan-forms";
import { LoanPaperShell } from "@/components/loans/loan-paper-shell";
import { formatDateInput } from "@/lib/dates";
import { rupeeInputFromPaise } from "@/lib/money";
import { roleHasPermission } from "@/server/authorization";
import { isCloudinaryConfigured } from "@/server/documents/cloudinary";
import { getLoanTransaction } from "@/server/loans/service";

export const metadata: Metadata = {
  title: "Edit loan transaction",
};

export default async function EditLoanTransactionPage({
  params,
}: {
  params: Promise<{ slug: string; txnId: string }>;
}) {
  const { slug, txnId } = await params;
  const { role, transaction } = await getLoanTransaction(slug, txnId);
  if (!roleHasPermission(role, "LOAN_EDIT")) notFound();

  const existingProofCount =
    transaction.proofDocuments?.length ??
    (transaction.proofDocumentId ? 1 : 0);

  return (
    <LoanPaperShell
      eyebrow="Home loan"
      title={`Edit ${transaction.loanNumber}`}
      description="Update amount, date, notes, or add payment screenshots. Type stays locked."
      backHref={`/p/${slug}/loans/${txnId}`}
      backLabel="Cancel"
    >
      <LoanTransactionForm
        slug={slug}
        transactionId={txnId}
        typeLocked
        cloudinaryReady={isCloudinaryConfigured()}
        existingProofCount={existingProofCount}
        openDiversions={[]}
        initial={{
          type: transaction.type,
          amountRupees: rupeeInputFromPaise(transaction.amount),
          transactionDate: formatDateInput(transaction.transactionDate),
          paidTo: transaction.paidTo,
          paymentMethod: transaction.paymentMethod,
          referenceNumber: transaction.referenceNumber,
          description: transaction.description,
          notes: transaction.notes,
          linkedDebitId: transaction.linkedDebitId,
        }}
      />
    </LoanPaperShell>
  );
}
