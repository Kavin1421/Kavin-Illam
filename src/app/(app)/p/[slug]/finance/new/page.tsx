import type { Metadata } from "next";

import {
  CreateAccountForm,
  CreateTransactionForm,
} from "@/components/finance/finance-forms";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDateInput } from "@/lib/dates";
import { rupeeInputFromPaise } from "@/lib/money";
import { isCloudinaryConfigured } from "@/server/documents/cloudinary";
import { listAccounts } from "@/server/finance/accounts";
import { listCategoriesForProject } from "@/server/finance/categories";
import { getLoanTransaction } from "@/server/loans/service";

export const metadata: Metadata = {
  title: "New transaction",
};

export default async function NewTransactionPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ fromLoanTxn?: string }>;
}) {
  const { slug } = await params;
  const { fromLoanTxn } = await searchParams;
  const [categories, accounts] = await Promise.all([
    listCategoriesForProject(slug),
    listAccounts(slug),
  ]);

  let sourceLoan:
    | {
        id: string;
        loanNumber: string;
        amountRupees: string;
        paidTo: string;
        paymentMethod: string;
        transactionDate: string;
        referenceNumber: string;
        description: string;
        notes: string;
      }
    | undefined;

  if (fromLoanTxn) {
    try {
      const { transaction } = await getLoanTransaction(slug, fromLoanTxn);
      if (
        transaction.type === "DEBIT_CONSTRUCTION" &&
        !transaction.linkedFinanceTransactionId
      ) {
        sourceLoan = {
          id: transaction.id,
          loanNumber: transaction.loanNumber,
          amountRupees: rupeeInputFromPaise(transaction.amount),
          paidTo: transaction.paidTo ?? "",
          paymentMethod: transaction.paymentMethod ?? "BANK_TRANSFER",
          transactionDate: formatDateInput(transaction.transactionDate),
          referenceNumber: transaction.referenceNumber ?? "",
          description:
            transaction.description ||
            `Home loan construction · ${transaction.loanNumber}`,
          notes: transaction.notes ?? "",
        };
      }
    } catch {
      sourceLoan = undefined;
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8 sm:px-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-2xl">
            Add transaction
          </CardTitle>
          <CardDescription>
            {sourceLoan
              ? `Prefilling from Home Loan ${sourceLoan.loanNumber}. Amounts are stored as integer paise.`
              : "Amounts are stored as integer paise. Private entries stay hidden from collaborators."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CreateTransactionForm
            slug={slug}
            categories={categories.map((c) => ({ id: c.id, name: c.name }))}
            accounts={accounts.map((a) => ({ id: a.id, name: a.name }))}
            cloudinaryReady={isCloudinaryConfigured()}
            typeLocked={Boolean(sourceLoan)}
            sourceLoanTransactionId={sourceLoan?.id}
            sourceLoanNumber={sourceLoan?.loanNumber}
            initial={
              sourceLoan
                ? {
                    amountRupees: sourceLoan.amountRupees,
                    type: "EXPENSE",
                    categoryId: "",
                    accountId: "",
                    paidTo: sourceLoan.paidTo,
                    paymentMethod: sourceLoan.paymentMethod,
                    transactionDate: sourceLoan.transactionDate,
                    referenceNumber: sourceLoan.referenceNumber,
                    description: sourceLoan.description,
                    notes: sourceLoan.notes,
                    visibility: "PROJECT_SHARED",
                    status: "PAID",
                    contractScope: "FULL",
                    contractIncludedRupees: "",
                  }
                : undefined
            }
          />
        </CardContent>
      </Card>

      {accounts.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Add an account first (optional)</CardTitle>
            <CardDescription>
              Track which bank/cash account paid the expense.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CreateAccountForm slug={slug} />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
