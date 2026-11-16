import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { LoanTransactionForm } from "@/components/loans/loan-forms";
import { LoanPaperShell } from "@/components/loans/loan-paper-shell";
import { formatDateInput } from "@/lib/dates";
import { formatInrFromPaise } from "@/lib/money";
import { roleHasPermission } from "@/server/authorization";
import { getLoanOverview } from "@/server/loans/service";

export const metadata: Metadata = {
  title: "Record loan transaction",
};

export default async function NewLoanTransactionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { role, facility, balances, openDiversions } =
    await getLoanOverview(slug);
  if (!roleHasPermission(role, "LOAN_CREATE")) notFound();
  if (!facility || !balances) {
    redirect(`/p/${slug}/loans/setup`);
  }

  return (
    <LoanPaperShell
      eyebrow="Home loan"
      title="Record transaction"
      description={`Available ${formatInrFromPaise(balances.available)} · Open rotational ${formatInrFromPaise(balances.openRotational)}`}
      backHref={`/p/${slug}/loans`}
    >
      <LoanTransactionForm
        slug={slug}
        openDiversions={openDiversions.map((row) => ({
          id: row.id,
          loanNumber: row.loanNumber,
          outstanding: row.outstanding,
          description: row.description,
          paidTo: row.paidTo,
        }))}
        initial={{
          transactionDate: formatDateInput(new Date()),
        }}
      />
    </LoanPaperShell>
  );
}
