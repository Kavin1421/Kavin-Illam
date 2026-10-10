"use client";

import { useActionState, useState } from "react";

import { ContractScopeFields } from "@/components/finance/contract-scope-fields";
import { PaymentProofUpload } from "@/components/finance/payment-proof-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createAccountAction,
  createTransactionAction,
  updateTransactionAction,
  type FinanceActionState,
} from "@/server/finance/actions";

const initialState: FinanceActionState = {};

type Option = { id: string; name: string };

export type TransactionFormInitial = {
  amountRupees: string;
  type: string;
  categoryId: string;
  accountId: string;
  paidTo: string;
  paymentMethod: string;
  transactionDate: string;
  referenceNumber: string;
  description: string;
  notes: string;
  visibility: string;
  status: string;
  contractScope: string;
  contractIncludedRupees: string;
};

export function CreateTransactionForm({
  slug,
  categories,
  accounts,
  cloudinaryReady,
  transactionId,
  initial,
  typeLocked = false,
}: {
  slug: string;
  categories: Option[];
  accounts: Option[];
  cloudinaryReady: boolean;
  transactionId?: string;
  initial?: TransactionFormInitial;
  typeLocked?: boolean;
}) {
  const action = transactionId
    ? updateTransactionAction.bind(null, slug, transactionId)
    : createTransactionAction.bind(null, slug);
  const [state, formAction, pending] = useActionState(action, initialState);
  const [paymentMethod, setPaymentMethod] = useState(
    initial?.paymentMethod || "BANK_TRANSFER",
  );
  const [amountRupees, setAmountRupees] = useState(initial?.amountRupees ?? "");

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
            value={amountRupees}
            onChange={(event) => setAmountRupees(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="type">Type</Label>
          {typeLocked ? (
            <input type="hidden" name="type" value={initial?.type ?? "EXPENSE"} />
          ) : null}
          <select
            id="type"
            name={typeLocked ? undefined : "type"}
            defaultValue={initial?.type ?? "EXPENSE"}
            disabled={typeLocked}
            className="border-input bg-background h-8 w-full rounded-lg border px-2 text-sm disabled:opacity-60"
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
            defaultValue={initial?.categoryId ?? ""}
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
            defaultValue={initial?.accountId ?? ""}
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
          <Input
            id="paidTo"
            name="paidTo"
            placeholder="Engineer / supplier"
            defaultValue={initial?.paidTo ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="paymentMethod">Payment method</Label>
          <select
            id="paymentMethod"
            name="paymentMethod"
            value={paymentMethod}
            onChange={(event) => setPaymentMethod(event.target.value)}
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
            defaultValue={
              initial?.transactionDate ?? new Date().toISOString().slice(0, 10)
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="referenceNumber">Reference</Label>
          <Input
            id="referenceNumber"
            name="referenceNumber"
            placeholder="UTR..."
            defaultValue={initial?.referenceNumber ?? ""}
          />
        </div>
      </div>
      {transactionId ? null : (
        <PaymentProofUpload
          slug={slug}
          paymentMethod={paymentMethod}
          cloudinaryReady={cloudinaryReady}
        />
      )}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          name="description"
          defaultValue={initial?.description ?? ""}
        />
      </div>
      {transactionId ? (
        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            defaultValue={initial?.notes ?? ""}
            className="border-input bg-background min-h-[5rem] w-full rounded-lg border px-3 py-2 text-sm text-white"
          />
        </div>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="visibility">Visibility</Label>
        <select
          id="visibility"
          name="visibility"
          defaultValue={initial?.visibility ?? "PROJECT_SHARED"}
          className="border-input bg-background h-8 w-full rounded-lg border px-2 text-sm"
        >
          <option value="PROJECT_SHARED">Project shared</option>
          <option value="PRIVATE">Private</option>
          <option value="RESTRICTED">Restricted</option>
        </select>
      </div>
      <ContractScopeFields
        amountRupees={amountRupees}
        defaultScope={initial?.contractScope ?? "MERGED"}
        defaultIncludedRupees={initial?.contractIncludedRupees ?? ""}
      />
      <input type="hidden" name="status" value={initial?.status ?? "PAID"} />
      {state.error ? (
        <p className="text-destructive text-sm" role="alert">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : transactionId ? "Save changes" : "Save transaction"}
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
