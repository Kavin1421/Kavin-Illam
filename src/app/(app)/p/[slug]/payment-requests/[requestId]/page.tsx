import type { Metadata } from "next";
import Link from "next/link";

import {
  PayPaymentRequestForm,
  ResubmitPaymentRequestForm,
  ReviewPaymentRequestForm,
} from "@/components/payments/payment-request-forms";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDate, formatDateTime } from "@/lib/dates";
import { formatInrFromPaise } from "@/lib/money";
import { roleHasPermission } from "@/server/authorization";
import { listAccounts } from "@/server/finance/accounts";
import { getPaymentRequest } from "@/server/payments/service";

export const metadata: Metadata = {
  title: "Payment request",
};

function paiseToRupeeInput(paise: number): string {
  const whole = Math.trunc(paise / 100);
  const frac = Math.abs(paise % 100)
    .toString()
    .padStart(2, "0");
  return frac === "00" ? String(whole) : `${whole}.${frac}`;
}

export default async function PaymentRequestDetailPage({
  params,
}: {
  params: Promise<{ slug: string; requestId: string }>;
}) {
  const { slug, requestId } = await params;
  const [{ role, request }, accounts] = await Promise.all([
    getPaymentRequest(slug, requestId),
    listAccounts(slug),
  ]);

  const canApprove = roleHasPermission(role, "PAYMENT_REQUEST_APPROVE");
  const canCreate = roleHasPermission(role, "PAYMENT_REQUEST_CREATE");
  const canReview =
    canApprove &&
    (request.status === "PENDING" || request.status === "CHANGES_REQUESTED");
  const canPay = canApprove && request.status === "APPROVED";
  const canResubmit =
    canCreate &&
    request.status === "CHANGES_REQUESTED" &&
    // Detail page doesn't expose session user id via role alone — resubmit
    // service enforces creator. Show form whenever engineer-capable + changes.
    true;

  const remaining = request.amount - request.paidAmount;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8 sm:px-6">
      <div className="space-y-1">
        <p className="text-muted-foreground font-mono text-xs">
          {request.requestNumber}
        </p>
        <h2 className="font-heading text-3xl tracking-tight">{request.title}</h2>
        <p className="text-2xl font-medium tracking-tight">
          {formatInrFromPaise(request.amount)}
        </p>
        <div className="flex flex-wrap gap-2">
          <Badge>{request.status}</Badge>
          <Badge variant="outline">{request.visibility}</Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
          <CardDescription>
            {request.description || "No description"}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-muted-foreground space-y-2 text-sm">
          <p>Payee: {request.payeeName ?? "—"}</p>
          <p>Category: {request.category?.name ?? "—"}</p>
          <p>Due: {request.dueDate ? formatDate(request.dueDate) : "—"}</p>
          <p>Paid so far: {formatInrFromPaise(request.paidAmount)}</p>
          <p>
            Requested by: {request.createdBy.name ?? request.createdBy.email} ·{" "}
            {formatDateTime(request.createdAt)}
          </p>
          {request.reviewedBy ? (
            <p>
              Reviewed by: {request.reviewedBy.name ?? request.reviewedBy.email}
              {request.reviewedAt
                ? ` · ${formatDateTime(request.reviewedAt)}`
                : ""}
            </p>
          ) : null}
          {request.reviewNote ? <p>Review note: {request.reviewNote}</p> : null}
          {request.linkedTransaction ? (
            <p>
              Linked ledger:{" "}
              <Link
                href={`/p/${slug}/finance/${request.linkedTransaction.id}`}
                className="underline-offset-4 hover:underline"
              >
                {request.linkedTransaction.transactionNumber} (
                {formatInrFromPaise(request.linkedTransaction.amount)})
              </Link>
            </p>
          ) : (
            <p>Linked ledger: none (required before PAID)</p>
          )}
        </CardContent>
      </Card>

      {canReview ? (
        <Card>
          <CardHeader>
            <CardTitle>Review</CardTitle>
            <CardDescription>
              Approve, reject, or request changes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ReviewPaymentRequestForm slug={slug} requestId={requestId} />
          </CardContent>
        </Card>
      ) : null}

      {canPay ? (
        <Card>
          <CardHeader>
            <CardTitle>Pay</CardTitle>
            <CardDescription>
              Marks paid only after creating and linking a ledger transaction.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PayPaymentRequestForm
              slug={slug}
              requestId={requestId}
              remainingLabel={formatInrFromPaise(remaining)}
              defaultAmountRupees={paiseToRupeeInput(remaining)}
              accounts={accounts.map((a) => ({ id: a.id, name: a.name }))}
            />
          </CardContent>
        </Card>
      ) : null}

      {canResubmit && request.status === "CHANGES_REQUESTED" ? (
        <Card>
          <CardHeader>
            <CardTitle>Resubmit</CardTitle>
            <CardDescription>
              Update details and send back for review.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResubmitPaymentRequestForm
              slug={slug}
              requestId={requestId}
              defaultTitle={request.title}
              defaultAmountRupees={paiseToRupeeInput(request.amount)}
            />
          </CardContent>
        </Card>
      ) : null}

      <Link
        href={`/p/${slug}/payment-requests`}
        className="text-muted-foreground text-sm underline-offset-4 hover:underline"
      >
        Back to payment requests
      </Link>
    </div>
  );
}
