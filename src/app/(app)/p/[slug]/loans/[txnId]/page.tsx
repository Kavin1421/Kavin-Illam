import type { Metadata } from "next";
import Link from "next/link";

import { LoanInvoice } from "@/components/loans/loan-invoice";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { roleHasPermission } from "@/server/authorization";
import { isEmailConfigured } from "@/server/email/send";
import { softDeleteLoanTransactionAction } from "@/server/loans/actions";
import { getLoanTransaction } from "@/server/loans/service";

export const metadata: Metadata = {
  title: "Loan receipt",
};

export default async function LoanTransactionPage({
  params,
}: {
  params: Promise<{ slug: string; txnId: string }>;
}) {
  const { slug, txnId } = await params;
  const { project, role, facility, transaction } = await getLoanTransaction(
    slug,
    txnId,
  );
  const canEdit = roleHasPermission(role, "LOAN_EDIT");
  const canDelete = roleHasPermission(role, "LOAN_DELETE");

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 px-4 py-8 sm:px-6">
      <div
        className="flex flex-wrap items-center gap-2"
        data-print-hide
      >
        <Link
          href={`/p/${slug}/loans`}
          className={cn(
            buttonVariants({ variant: "outline" }),
            "border-white/20 bg-white/5 text-white",
          )}
        >
          Ledger
        </Link>
        {canEdit ? (
          <Link
            href={`/p/${slug}/loans/${txnId}/edit`}
            className={cn(
              buttonVariants({ variant: "outline" }),
              "ml-auto border-white/20 bg-white/5 text-white",
            )}
          >
            Edit
          </Link>
        ) : null}
        {canDelete ? (
          <form
            action={softDeleteLoanTransactionAction.bind(null, slug, txnId)}
          >
            <input type="hidden" name="deletionReason" value="" />
            <button
              type="submit"
              className={cn(
                buttonVariants({ variant: "outline", size: "default" }),
                "border-red-400/40 bg-red-500/10 text-red-100 hover:bg-red-500/20",
              )}
            >
              Delete
            </button>
          </form>
        ) : null}
      </div>

      <LoanInvoice
        slug={slug}
        projectName={project.name}
        emailConfigured={isEmailConfigured()}
        defaultRecipientEmail={transaction.createdBy.email}
        facility={{
          lenderName: facility.lenderName,
          sanctionedAmount: facility.sanctionedAmount,
        }}
        transaction={transaction}
      />
    </div>
  );
}
