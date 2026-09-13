import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDate, formatDateTime } from "@/lib/dates";
import { formatInrFromPaise } from "@/lib/money";
import { withNotFound } from "@/lib/with-not-found";
import { roleHasPermission } from "@/server/authorization";
import { softDeleteTransactionAction } from "@/server/finance/actions";
import { getTransaction } from "@/server/finance/transactions";

export const metadata: Metadata = {
  title: "Transaction",
};

export default async function TransactionDetailPage({
  params,
}: {
  params: Promise<{ slug: string; transactionId: string }>;
}) {
  const { slug, transactionId } = await params;
  const { role, transaction } = await withNotFound(() =>
    getTransaction(slug, transactionId),
  );
  const canDelete = roleHasPermission(role, "FINANCE_DELETE");

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8 sm:px-6">
      <div className="space-y-1">
        <p className="text-muted-foreground font-mono text-xs">
          {transaction.transactionNumber}
        </p>
        <h2 className="font-heading text-3xl tracking-tight">
          {formatInrFromPaise(transaction.amount)}
        </h2>
        <div className="flex flex-wrap gap-2">
          <Badge>{transaction.type}</Badge>
          <Badge variant="secondary">{transaction.status}</Badge>
          <Badge variant="outline">{transaction.visibility}</Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
          <CardDescription>
            {transaction.description || "No description"}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-muted-foreground space-y-2 text-sm">
          <p>Date: {formatDate(transaction.transactionDate)}</p>
          <p>Category: {transaction.category?.name ?? "—"}</p>
          <p>Account: {transaction.account?.name ?? "—"}</p>
          <p>Paid to: {transaction.paidTo ?? "—"}</p>
          <p>Method: {transaction.paymentMethod ?? "—"}</p>
          <p>Reference: {transaction.referenceNumber ?? "—"}</p>
          {transaction.proofDocument ? (
            <p>
              Payment proof:{" "}
              <Link
                href={`/p/${slug}/documents/${transaction.proofDocument.id}`}
                className="text-foreground underline-offset-4 hover:underline"
              >
                {transaction.proofDocument.title} (
                {transaction.proofDocument.documentNumber})
              </Link>
            </p>
          ) : null}
          <p>
            Created by:{" "}
            {transaction.createdBy.name ?? transaction.createdBy.email} ·{" "}
            {formatDateTime(transaction.createdAt)}
          </p>
          {transaction.notes ? <p>Notes: {transaction.notes}</p> : null}
        </CardContent>
      </Card>

      <Link
        href={`/p/${slug}/finance`}
        className="text-muted-foreground text-sm underline-offset-4 hover:underline"
      >
        Back to finance
      </Link>

      {canDelete && !transaction.deletedAt ? (
        <Card>
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
