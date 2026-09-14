import type { Metadata } from "next";
import Link from "next/link";

import { TransactionInvoice } from "@/components/finance/transaction-invoice";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { withNotFound } from "@/lib/with-not-found";
import { roleHasPermission } from "@/server/authorization";
import { isEmailConfigured } from "@/server/email/send";
import { softDeleteTransactionAction } from "@/server/finance/actions";
import { getTransaction } from "@/server/finance/transactions";

export const metadata: Metadata = {
  title: "Payment receipt",
};

export default async function TransactionDetailPage({
  params,
}: {
  params: Promise<{ slug: string; transactionId: string }>;
}) {
  const { slug, transactionId } = await params;
  const { role, project, transaction } = await withNotFound(() =>
    getTransaction(slug, transactionId),
  );
  const canDelete = roleHasPermission(role, "FINANCE_DELETE");

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-8 sm:px-6">
      <div data-print-hide className="flex flex-wrap items-center gap-3 text-sm">
        <Link
          href={`/p/${slug}/finance`}
          className="text-muted-foreground underline-offset-4 hover:text-white hover:underline"
        >
          ← Back to finance
        </Link>
        <span className="text-white/20">/</span>
        <span className="text-muted-foreground">Invoice</span>
        <span className="text-white/20">/</span>
        <span className="font-mono text-xs text-white">
          {transaction.transactionNumber}
        </span>
      </div>

      <TransactionInvoice
        slug={slug}
        projectName={project.name}
        projectType={project.projectType}
        emailConfigured={isEmailConfigured()}
        defaultRecipientEmail={null}
        transaction={transaction}
      />

      {canDelete && !transaction.deletedAt ? (
        <Card data-print-hide>
          <CardHeader>
            <CardTitle>Soft delete</CardTitle>
            <CardDescription>
              Financial records are never hard-deleted.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              action={softDeleteTransactionAction.bind(
                null,
                slug,
                transactionId,
              )}
              className="space-y-3"
            >
              <input
                name="reason"
                required
                minLength={3}
                placeholder="Reason"
                className="border-input bg-background h-8 w-full rounded-lg border px-2 text-sm"
              />
              <Button type="submit" variant="destructive">
                Soft delete
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
