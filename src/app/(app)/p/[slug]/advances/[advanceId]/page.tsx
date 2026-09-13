import type { Metadata } from "next";
import Link from "next/link";

import { SettleAdvanceForm } from "@/components/advances/advance-forms";
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
import { softDeleteAdvanceAction } from "@/server/advances/actions";
import { getAdvance } from "@/server/advances/service";
import { roleHasPermission } from "@/server/authorization";
import { listAccounts } from "@/server/finance/accounts";

export const metadata: Metadata = {
  title: "Advance",
};

export default async function AdvanceDetailPage({
  params,
}: {
  params: Promise<{ slug: string; advanceId: string }>;
}) {
  const { slug, advanceId } = await params;
  const [{ role, advance }, accounts] = await Promise.all([
    getAdvance(slug, advanceId),
    listAccounts(slug),
  ]);
  const canCreate = roleHasPermission(role, "FINANCE_CREATE");
  const canDelete = roleHasPermission(role, "FINANCE_DELETE");
  const canSettle =
    canCreate &&
    advance.status !== "CANCELLED" &&
    advance.status !== "SETTLED" &&
    !advance.deletedAt;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8 sm:px-6">
      <div className="space-y-1">
        <p className="text-muted-foreground font-mono text-xs">
          {advance.advanceNumber}
        </p>
        <h2 className="font-heading text-3xl tracking-tight">
          {formatInrFromPaise(advance.outstanding)}
        </h2>
        <p className="text-muted-foreground text-sm">
          Outstanding of {formatInrFromPaise(advance.originalAmount)} original
        </p>
        <div className="flex flex-wrap gap-2">
          <Badge>{advance.status}</Badge>
          <Badge variant="outline">{advance.visibility}</Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
          <CardDescription>
            {advance.description || "No description"}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-muted-foreground space-y-2 text-sm">
          <p>Recipient: {advance.recipientName ?? "—"}</p>
          <p>Issued: {formatDate(advance.issuedAt)}</p>
          <p>Settled: {formatInrFromPaise(advance.settledAmount)}</p>
          <p>Refunded: {formatInrFromPaise(advance.refundedAmount)}</p>
          <p>
            Created by: {advance.createdBy.name ?? advance.createdBy.email} ·{" "}
            {formatDateTime(advance.createdAt)}
          </p>
          {advance.fundingTransaction ? (
            <p>
              Funding ledger:{" "}
              <Link
                href={`/p/${slug}/finance/${advance.fundingTransaction.id}`}
                className="underline-offset-4 hover:underline"
              >
                {advance.fundingTransaction.transactionNumber}
              </Link>
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>History</CardTitle>
          <CardDescription>Settlements and refunds</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {advance.settlements.length === 0 ? (
            <p className="text-muted-foreground text-sm">No settlements yet.</p>
          ) : (
            advance.settlements.map((row) => (
              <div
                key={row.id}
                className="border-border flex flex-wrap items-start justify-between gap-2 border-b pb-3 last:border-0 last:pb-0"
              >
                <div>
                  <p className="font-medium">
                    {formatInrFromPaise(row.amount)} · {row.kind}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    {formatDate(row.settledAt)}
                    {row.description ? ` · ${row.description}` : ""}
                  </p>
                  {row.transaction ? (
                    <Link
                      href={`/p/${slug}/finance/${row.transaction.id}`}
                      className="text-muted-foreground font-mono text-xs underline-offset-4 hover:underline"
                    >
                      {row.transaction.transactionNumber}
                    </Link>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {canSettle ? (
        <Card>
          <CardHeader>
            <CardTitle>Settle or refund</CardTitle>
            <CardDescription>
              Amount cannot exceed the server-computed outstanding balance.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SettleAdvanceForm
              slug={slug}
              advanceId={advanceId}
              outstandingLabel={formatInrFromPaise(advance.outstanding)}
              accounts={accounts.map((a) => ({ id: a.id, name: a.name }))}
            />
          </CardContent>
        </Card>
      ) : null}

      <Link
        href={`/p/${slug}/advances`}
        className="text-muted-foreground text-sm underline-offset-4 hover:underline"
      >
        Back to advances
      </Link>

      {canDelete && !advance.deletedAt ? (
        <Card>
          <CardHeader>
            <CardTitle>Soft delete</CardTitle>
            <CardDescription>
              Cancels the advance without hard-deleting history.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              action={softDeleteAdvanceAction.bind(null, slug, advanceId)}
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
