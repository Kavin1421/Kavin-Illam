import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDate } from "@/lib/dates";
import { formatInrFromPaise } from "@/lib/money";
import { cn } from "@/lib/utils";
import { roleHasPermission } from "@/server/authorization";
import { listPaymentRequests } from "@/server/payments/service";

export const metadata: Metadata = {
  title: "Payment requests",
};

export default async function PaymentRequestsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { role, requests, totals } = await listPaymentRequests(slug);
  const canCreate = roleHasPermission(role, "PAYMENT_REQUEST_CREATE");

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h2 className="font-heading text-2xl tracking-tight">
            Payment requests
          </h2>
          <p className="text-muted-foreground text-sm">
            Approve, reject, or pay — paid status always links a ledger row.
          </p>
        </div>
        {canCreate ? (
          <Link
            href={`/p/${slug}/payment-requests/new`}
            className={cn(buttonVariants())}
          >
            New request
          </Link>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total</CardDescription>
            <CardTitle className="text-xl">{totals.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending review</CardDescription>
            <CardTitle className="text-xl">{totals.pendingCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Ready to pay</CardDescription>
            <CardTitle className="text-xl">{totals.approvedCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {requests.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No payment requests</CardTitle>
            <CardDescription>
              Engineers submit requests; owners approve and pay with a linked
              transaction.
            </CardDescription>
          </CardHeader>
          {canCreate ? (
            <CardContent>
              <Link
                href={`/p/${slug}/payment-requests/new`}
                className={cn(buttonVariants())}
              >
                Create first request
              </Link>
            </CardContent>
          ) : null}
        </Card>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-lg border md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/40 border-b">
                <tr>
                  <th className="px-3 py-2 font-medium">Created</th>
                  <th className="px-3 py-2 font-medium">Number</th>
                  <th className="px-3 py-2 font-medium">Title</th>
                  <th className="px-3 py-2 font-medium">Amount</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((request) => (
                  <tr key={request.id} className="border-b last:border-0">
                    <td className="px-3 py-2">
                      <Link
                        href={`/p/${slug}/payment-requests/${request.id}`}
                        className="hover:underline"
                      >
                        {formatDate(request.createdAt)}
                      </Link>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {request.requestNumber}
                    </td>
                    <td className="px-3 py-2">{request.title}</td>
                    <td className="px-3 py-2 font-medium">
                      {formatInrFromPaise(request.amount)}
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant="outline">{request.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 md:hidden">
            {requests.map((request) => (
              <Link
                key={request.id}
                href={`/p/${slug}/payment-requests/${request.id}`}
                className="border-border block rounded-lg border p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{request.title}</p>
                    <p className="text-muted-foreground text-sm">
                      {formatInrFromPaise(request.amount)} ·{" "}
                      {formatDate(request.createdAt)}
                    </p>
                  </div>
                  <Badge variant="outline">{request.status}</Badge>
                </div>
                <p className="text-muted-foreground mt-1 font-mono text-xs">
                  {request.requestNumber}
                </p>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
