"use client";

import { useActionState, useState } from "react";

import { PaymentProofUpload } from "@/components/finance/payment-proof-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createPaymentRequestAction,
  payPaymentRequestAction,
  resubmitPaymentRequestAction,
  reviewPaymentRequestAction,
  type PaymentActionState,
} from "@/server/payments/actions";

const initialState: PaymentActionState = {};

type Option = { id: string; name: string };

export function CreatePaymentRequestForm({
  slug,
  categories,
}: {
  slug: string;
  categories: Option[];
}) {
  const action = createPaymentRequestAction.bind(null, slug);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          name="title"
          required
          placeholder="Steel for foundation"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="amountRupees">Amount (₹)</Label>
          <Input
            id="amountRupees"
            name="amountRupees"
            required
            inputMode="decimal"
            placeholder="25000"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="payeeName">Payee</Label>
          <Input id="payeeName" name="payeeName" placeholder="Supplier name" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="categoryId">Category</Label>
          <select
            id="categoryId"
            name="categoryId"
            className="border-input bg-background h-8 w-full rounded-lg border px-2 text-sm"
            defaultValue=""
          >
            <option value="">Select category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="dueDate">Due date</Label>
          <Input id="dueDate" name="dueDate" type="date" />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Input id="description" name="description" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="visibility">Visibility</Label>
        <select
          id="visibility"
          name="visibility"
          defaultValue="PROJECT_SHARED"
          className="border-input bg-background h-8 w-full rounded-lg border px-2 text-sm"
        >
          <option value="PROJECT_SHARED">Project shared</option>
          <option value="PRIVATE">Private</option>
          <option value="RESTRICTED">Restricted</option>
        </select>
      </div>
      {state.error ? (
        <p className="text-destructive text-sm" role="alert">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Submitting…" : "Submit request"}
      </Button>
    </form>
  );
}

export function ReviewPaymentRequestForm({
  slug,
  requestId,
}: {
  slug: string;
  requestId: string;
}) {
  const action = reviewPaymentRequestAction.bind(null, slug, requestId);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="action">Decision</Label>
        <select
          id="action"
          name="action"
          defaultValue="APPROVE"
          className="border-input bg-background h-8 w-full rounded-lg border px-2 text-sm"
        >
          <option value="APPROVE">Approve</option>
          <option value="REJECT">Reject</option>
          <option value="REQUEST_CHANGES">Request changes</option>
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="reviewNote">Note (required for reject / changes)</Label>
        <Input id="reviewNote" name="reviewNote" />
      </div>
      {state.error ? (
        <p className="text-destructive text-sm" role="alert">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Submit decision"}
      </Button>
    </form>
  );
}

export function PayPaymentRequestForm({
  slug,
  requestId,
  remainingLabel,
  defaultAmountRupees,
  accounts,
  cloudinaryReady,
}: {
  slug: string;
  requestId: string;
  remainingLabel: string;
  defaultAmountRupees: string;
  accounts: Option[];
  cloudinaryReady: boolean;
}) {
  const action = payPaymentRequestAction.bind(null, slug, requestId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const [paymentMethod, setPaymentMethod] = useState("BANK_TRANSFER");

  return (
    <form action={formAction} className="space-y-4">
      <p className="text-muted-foreground text-sm">
        Remaining: {remainingLabel}. Creates one ledger expense and links it —
        required before the request can be PAID.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="amountRupees">Pay amount (₹)</Label>
          <Input
            id="amountRupees"
            name="amountRupees"
            required
            inputMode="decimal"
            defaultValue={defaultAmountRupees}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="paymentDate">Payment date</Label>
          <Input
            id="paymentDate"
            name="paymentDate"
            type="date"
            required
            defaultValue={new Date().toISOString().slice(0, 10)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="accountId">Account</Label>
          <select
            id="accountId"
            name="accountId"
            className="border-input bg-background h-8 w-full rounded-lg border px-2 text-sm"
            defaultValue=""
          >
            <option value="">Select account</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="paymentMethod">Method</Label>
          <select
            id="paymentMethod"
            name="paymentMethod"
            value={paymentMethod}
            onChange={(event) => setPaymentMethod(event.target.value)}
            className="border-input bg-background h-8 w-full rounded-lg border px-2 text-sm"
          >
            <option value="BANK_TRANSFER">Bank transfer</option>
            <option value="UPI">UPI</option>
            <option value="CASH">Cash</option>
            <option value="NEFT">NEFT</option>
            <option value="RTGS">RTGS</option>
            <option value="IMPS">IMPS</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
      </div>
      <PaymentProofUpload
        slug={slug}
        paymentMethod={paymentMethod}
        cloudinaryReady={cloudinaryReady}
      />
      <div className="space-y-2">
        <Label htmlFor="referenceNumber">Reference</Label>
        <Input id="referenceNumber" name="referenceNumber" />
      </div>
      {state.error ? (
        <p className="text-destructive text-sm" role="alert">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Paying…" : "Pay & link transaction"}
      </Button>
    </form>
  );
}

export function ResubmitPaymentRequestForm({
  slug,
  requestId,
  defaultTitle,
  defaultAmountRupees,
}: {
  slug: string;
  requestId: string;
  defaultTitle: string;
  defaultAmountRupees: string;
}) {
  const action = resubmitPaymentRequestAction.bind(null, slug, requestId);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" defaultValue={defaultTitle} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="amountRupees">Amount (₹)</Label>
        <Input
          id="amountRupees"
          name="amountRupees"
          inputMode="decimal"
          defaultValue={defaultAmountRupees}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Input id="description" name="description" />
      </div>
      {state.error ? (
        <p className="text-destructive text-sm" role="alert">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Resubmitting…" : "Resubmit for review"}
      </Button>
    </form>
  );
}
