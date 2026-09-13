"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createAccountAction,
  createTransactionAction,
  type FinanceActionState,
} from "@/server/finance/actions";

const initialState: FinanceActionState = {};

type Option = { id: string; name: string };

export function CreateTransactionForm({
  slug,
  categories,
  accounts,
}: {
  slug: string;
  categories: Option[];
  accounts: Option[];
}) {
  const action = createTransactionAction.bind(null, slug);
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
          <Label htmlFor="type">Type</Label>
          <select
            id="type"
            name="type"
            defaultValue="EXPENSE"
            className="border-input bg-background h-8 w-full rounded-lg border px-2 text-sm"
          >
            <option value="EXPENSE">Expense</option>
            <option value="INCOME">Income</option>
            <option value="ADVANCE">Advance</option>
            <option value="TRANSFER">Transfer</option>
            <option value="REFUND">Refund</option>
            <option value="ADJUSTMENT">Adjustment</option>
            <option value="SETTLEMENT">Settlement</option>
          </select>
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
          <Label htmlFor="paidTo">Paid to</Label>
          <Input id="paidTo" name="paidTo" placeholder="Engineer / supplier" />
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
            <option value="CARD">Card</option>
            <option value="CHEQUE">Cheque</option>
            <option value="NEFT">NEFT</option>
            <option value="RTGS">RTGS</option>
            <option value="IMPS">IMPS</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="transactionDate">Date</Label>
          <Input
            id="transactionDate"
            name="transactionDate"
            type="date"
            required
            defaultValue={new Date().toISOString().slice(0, 10)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="referenceNumber">Reference</Label>
          <Input id="referenceNumber" name="referenceNumber" placeholder="UTR..." />
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
      <input type="hidden" name="status" value="PAID" />
      {state.error ? (
        <p className="text-destructive text-sm" role="alert">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save transaction"}
      </Button>
    </form>
  );
}

export function CreateAccountForm({ slug }: { slug: string }) {
  const action = createAccountAction.bind(null, slug);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Account name</Label>
        <Input id="name" name="name" required placeholder="HDFC Bank" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="type">Type</Label>
        <select
          id="type"
          name="type"
          defaultValue="BANK"
          className="border-input bg-background h-8 w-full rounded-lg border px-2 text-sm"
        >
          <option value="BANK">Bank</option>
          <option value="CASH">Cash</option>
          <option value="UPI">UPI</option>
          <option value="CREDIT_CARD">Credit card</option>
          <option value="OTHER">Other</option>
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="institution">Institution</Label>
        <Input id="institution" name="institution" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="maskedIdentifier">Masked identifier</Label>
        <Input
          id="maskedIdentifier"
          name="maskedIdentifier"
          placeholder="XXXX1234"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="openingBalanceRupees">Opening balance (₹)</Label>
        <Input id="openingBalanceRupees" name="openingBalanceRupees" />
      </div>
      <input type="hidden" name="currency" value="INR" />
      {state.error ? (
        <p className="text-destructive text-sm" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="text-sm text-emerald-700" role="status">
          {state.success}
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Add account"}
      </Button>
    </form>
  );
}
