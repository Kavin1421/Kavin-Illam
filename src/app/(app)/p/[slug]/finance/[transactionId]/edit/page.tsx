import type { Metadata } from "next";
import Link from "next/link";

import { CreateTransactionForm } from "@/components/finance/finance-forms";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDateInput } from "@/lib/dates";
import { rupeeInputFromPaise } from "@/lib/money";
import { withNotFound } from "@/lib/with-not-found";
import { requireProjectPermissionBySlug } from "@/server/authorization";
import { isCloudinaryConfigured } from "@/server/documents/cloudinary";
import { listAccounts } from "@/server/finance/accounts";
import { listCategoriesForProject } from "@/server/finance/categories";
import { getTransaction } from "@/server/finance/transactions";

export const metadata: Metadata = {
  title: "Edit transaction",
};

function contractInitial(transaction: {
  amount: number;
  includeInContract: boolean | null;
  outOfContractAmount: number | null;
}) {
  if (transaction.includeInContract === false) {
    return { contractScope: "OUT_OF_CONTRACT", contractIncludedRupees: "" };
  }
  const outPaise = transaction.outOfContractAmount ?? 0;
  if (outPaise > 0 && outPaise < transaction.amount) {
    return {
      contractScope: "SPLIT",
      contractIncludedRupees: rupeeInputFromPaise(transaction.amount - outPaise),
    };
  }
  return { contractScope: "MERGED", contractIncludedRupees: "" };
}

export default async function EditTransactionPage({
  params,
}: {
  params: Promise<{ slug: string; transactionId: string }>;
}) {
  const { slug, transactionId } = await params;
  await requireProjectPermissionBySlug(slug, "FINANCE_EDIT");
  const [{ transaction }, categories, accounts] = await Promise.all([
    withNotFound(() => getTransaction(slug, transactionId)),
    listCategoriesForProject(slug),
    listAccounts(slug),
  ]);
  const contract = contractInitial(transaction);
  const typeLocked = Boolean(
    transaction.advanceFunding ||
      transaction.advanceSettlement ||
      transaction.paymentRequests.length > 0,
  );

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8 sm:px-6">
      <Link
        href={`/p/${slug}/finance/${transactionId}`}
        className="text-muted-foreground text-sm underline-offset-4 hover:text-white hover:underline"
      >
        ← Back to receipt
      </Link>
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-2xl">
            Edit transaction
          </CardTitle>
          <CardDescription>
            {transaction.transactionNumber}. Change the amount, details, or how
            much of this payment stays in the contract.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CreateTransactionForm
            slug={slug}
            categories={categories}
            accounts={accounts}
            cloudinaryReady={isCloudinaryConfigured()}
            transactionId={transactionId}
            typeLocked={typeLocked}
            initial={{
              amountRupees: rupeeInputFromPaise(transaction.amount),
              type: transaction.type,
              categoryId: transaction.categoryId ?? "",
              accountId: transaction.accountId ?? "",
              paidTo: transaction.paidTo ?? "",
              paymentMethod: transaction.paymentMethod ?? "CASH",
              transactionDate: formatDateInput(transaction.transactionDate),
              referenceNumber: transaction.referenceNumber ?? "",
              description: transaction.description ?? "",
              notes: transaction.notes ?? "",
              visibility: transaction.visibility,
              status: transaction.status,
              contractScope: contract.contractScope,
              contractIncludedRupees: contract.contractIncludedRupees,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
