"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createAdvanceAction,
  settleAdvanceAction,
  type AdvanceActionState,
} from "@/server/advances/actions";

const initialState: AdvanceActionState = {};

type Option = { id: string; name: string };

export function CreateAdvanceForm({
  slug,
  categories,
  accounts,
}: {
  slug: string;
  categories: Option[];
  accounts: Option[];
}) {
  const action = createAdvanceAction.bind(null, slug);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="amountRupees">Amount (₹)</Label>
          <Input
            id="amountRupees"
            name="amountRupees"
            required
            placeholder="500000"
            inputMode="decimal"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="recipientName">Recipient</Label>
          <Input
            id="recipientName"
            name="recipientName"
            required
            placeholder="Engineer"
          />
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
          <Label htmlFor="paymentMethod">Payment method</Label>
          <select
            id="paymentMethod"
            name="paymentMethod"
            defaultValue="BANK_TRANSFER"
            className="border-input bg-background h-8 w-full rounded-lg border px-2 text-sm"
          >
            <option value="CASH">Cash</option>
            <option value="BANK_TRANSFER">Bank transfer</option>
            <option value="UPI">UPI</option>
            <option value="NEFT">NEFT</option>
            <option value="RTGS">RTGS</option>
            <option value="IMPS">IMPS</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="issuedAt">Issued on</Label>
          <Input
            id="issuedAt"
            name="issuedAt"
            type="date"
            required
            defaultValue={new Date().toISOString().slice(0, 10)}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="referenceNumber">Reference</Label>
          <Input
            id="referenceNumber"
            name="referenceNumber"
            placeholder="UTR..."
          />
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
        {pending ? "Saving…" : "Issue advance"}
      </Button>
    </form>
  );
}

export function SettleAdvanceForm({
  slug,
  advanceId,
  outstandingLabel,
  accounts,
  defaultKind = "SETTLEMENT",
}: {
  slug: string;
  advanceId: string;
  outstandingLabel: string;
  accounts: Option[];
  defaultKind?: "SETTLEMENT" | "REFUND";
}) {
  const action = settleAdvanceAction.bind(null, slug, advanceId);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <p className="text-muted-foreground text-sm">
        Outstanding (server): {outstandingLabel}
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="kind">Kind</Label>
          <select
            id="kind"
            name="kind"
            defaultValue={defaultKind}
            className="border-input bg-background h-8 w-full rounded-lg border px-2 text-sm"
          >
            <option value="SETTLEMENT">Settlement</option>
            <option value="REFUND">Refund</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="amountRupees">Amount (₹)</Label>
          <Input
            id="amountRupees"
            name="amountRupees"
            required
            inputMode="decimal"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="settledAt">Date</Label>
          <Input
            id="settledAt"
            name="settledAt"
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
            <option value="">Default / same as advance</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        </div>
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
        {pending ? "Saving…" : "Record against advance"}
      </Button>
    </form>
  );
}
