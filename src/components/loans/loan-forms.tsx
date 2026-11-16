"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  createLoanFacilityAction,
  createLoanTransactionAction,
  updateLoanFacilityAction,
  updateLoanTransactionAction,
  type LoanActionState,
} from "@/server/loans/actions";

const initialState: LoanActionState = {};

/** Light “paper” fields for white loan cards (default Input is dark-shell). */
const paperLabel =
  "text-sm font-semibold text-slate-700";
const paperInput =
  "h-11 border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 shadow-none focus-visible:border-emerald-500 focus-visible:ring-emerald-500/20";
const paperSelect =
  "h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition focus-visible:border-emerald-500 focus-visible:ring-[3px] focus-visible:ring-emerald-500/20";
const paperTextarea =
  "min-h-[96px] w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus-visible:border-emerald-500 focus-visible:ring-[3px] focus-visible:ring-emerald-500/20";
const paperButton =
  "h-11 bg-emerald-700 px-5 text-white hover:bg-emerald-800";

const METHODS = [
  "CASH",
  "BANK_TRANSFER",
  "UPI",
  "NEFT",
  "RTGS",
  "IMPS",
  "CHEQUE",
  "CARD",
  "OTHER",
] as const;

type OpenDiversion = {
  id: string;
  loanNumber: string;
  outstanding: number;
  description?: string | null;
  paidTo?: string | null;
};

export function LoanFacilityForm({
  slug,
  mode,
  initial,
}: {
  slug: string;
  mode: "create" | "edit";
  initial?: {
    lenderName?: string | null;
    sanctionedRupees: string;
    interestRatePercent?: string;
    tenureMonths?: string;
    notes?: string | null;
  };
}) {
  const action =
    mode === "create"
      ? createLoanFacilityAction.bind(null, slug)
      : updateLoanFacilityAction.bind(null, slug);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-6 text-slate-900">
      {state.error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {state.success}
        </p>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="lenderName" className={paperLabel}>
            Lender / bank
          </Label>
          <Input
            id="lenderName"
            name="lenderName"
            defaultValue={initial?.lenderName ?? ""}
            placeholder="e.g. SBI Home Loan"
            className={paperInput}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sanctionedRupees" className={paperLabel}>
            Sanctioned amount (₹)
          </Label>
          <Input
            id="sanctionedRupees"
            name="sanctionedRupees"
            required
            defaultValue={initial?.sanctionedRupees ?? ""}
            placeholder="5030000"
            inputMode="decimal"
            className={paperInput}
          />
          <p className="text-xs text-slate-500">
            Full bank sanction in rupees, e.g. 5030000 for ₹50,30,000.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="interestRatePercent" className={paperLabel}>
            Interest rate (% p.a.)
          </Label>
          <Input
            id="interestRatePercent"
            name="interestRatePercent"
            defaultValue={initial?.interestRatePercent ?? ""}
            placeholder="8.50"
            inputMode="decimal"
            className={paperInput}
          />
          <p className="text-xs text-slate-500">
            Display only for now — no EMI calculation yet.
          </p>
        </div>
        <div className="space-y-2 sm:col-span-2 sm:max-w-xs">
          <Label htmlFor="tenureMonths" className={paperLabel}>
            Tenure (months)
          </Label>
          <Input
            id="tenureMonths"
            name="tenureMonths"
            defaultValue={initial?.tenureMonths ?? ""}
            placeholder="120"
            inputMode="numeric"
            className={paperInput}
          />
          <p className="text-xs text-slate-500">
            Example: 120 months = 10 years.
          </p>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="notes" className={paperLabel}>
            Notes
          </Label>
          <textarea
            id="notes"
            name="notes"
            defaultValue={initial?.notes ?? ""}
            rows={4}
            placeholder="Optional notes about this Home Loan facility"
            className={paperTextarea}
          />
        </div>
      </div>

      <Button
        type="submit"
        disabled={pending}
        className={cn(paperButton, "w-full sm:w-auto")}
      >
        {pending
          ? "Saving…"
          : mode === "create"
            ? "Create Home Loan"
            : "Save facility"}
      </Button>
    </form>
  );
}

export function LoanTransactionForm({
  slug,
  openDiversions,
  transactionId,
  initial,
  typeLocked,
}: {
  slug: string;
  openDiversions: OpenDiversion[];
  transactionId?: string;
  typeLocked?: boolean;
  initial?: {
    type?: string;
    amountRupees?: string;
    transactionDate?: string;
    paidTo?: string | null;
    paymentMethod?: string | null;
    referenceNumber?: string | null;
    description?: string | null;
    notes?: string | null;
    linkedDebitId?: string | null;
  };
}) {
  const action = transactionId
    ? updateLoanTransactionAction.bind(null, slug, transactionId)
    : createLoanTransactionAction.bind(null, slug);
  const [state, formAction, pending] = useActionState(action, initialState);
  const [type, setType] = useState(initial?.type ?? "DISBURSEMENT");

  return (
    <form action={formAction} className="space-y-6 text-slate-900">
      {state.error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {state.error}
        </p>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="type" className={paperLabel}>
            Transaction type
          </Label>
          {transactionId || typeLocked ? (
            <>
              <input type="hidden" name="type" value={type} />
              <Input
                id="type"
                value={labelForType(type)}
                disabled
                readOnly
                className={cn(paperInput, "disabled:bg-slate-100 disabled:text-slate-700")}
              />
            </>
          ) : (
            <select
              id="type"
              name="type"
              className={paperSelect}
              value={type}
              onChange={(event) => setType(event.target.value)}
            >
              <option value="DISBURSEMENT">Disbursement (from bank)</option>
              <option value="DEBIT_CONSTRUCTION">
                Debit · construction purpose
              </option>
              <option value="DEBIT_OTHER">
                Debit · other purpose (rotational)
              </option>
              <option value="CREDIT_REPAYMENT">
                Credit · repay a diversion
              </option>
            </select>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="amountRupees" className={paperLabel}>
            Amount (₹)
          </Label>
          <Input
            id="amountRupees"
            name="amountRupees"
            required
            defaultValue={initial?.amountRupees ?? ""}
            inputMode="decimal"
            className={paperInput}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="transactionDate" className={paperLabel}>
            Date
          </Label>
          <Input
            id="transactionDate"
            name="transactionDate"
            type="date"
            required
            defaultValue={initial?.transactionDate ?? ""}
            className={paperInput}
          />
        </div>

        {!transactionId && type === "CREDIT_REPAYMENT" ? (
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="linkedDebitId" className={paperLabel}>
              Repay against diversion
            </Label>
            <select
              id="linkedDebitId"
              name="linkedDebitId"
              required
              className={paperSelect}
              defaultValue={initial?.linkedDebitId ?? ""}
            >
              <option value="">Select open diversion…</option>
              {openDiversions.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.loanNumber} · open ₹
                  {(row.outstanding / 100).toLocaleString("en-IN")}
                  {row.paidTo ? ` · ${row.paidTo}` : ""}
                  {row.description ? ` · ${row.description}` : ""}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="paidTo" className={paperLabel}>
            Paid to / from
          </Label>
          <Input
            id="paidTo"
            name="paidTo"
            defaultValue={initial?.paidTo ?? ""}
            placeholder="Engineer / college / bank"
            className={paperInput}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="paymentMethod" className={paperLabel}>
            Method
          </Label>
          <select
            id="paymentMethod"
            name="paymentMethod"
            className={paperSelect}
            defaultValue={initial?.paymentMethod ?? ""}
          >
            <option value="">—</option>
            {METHODS.map((method) => (
              <option key={method} value={method}>
                {method.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="referenceNumber" className={paperLabel}>
            Reference / UTR
          </Label>
          <Input
            id="referenceNumber"
            name="referenceNumber"
            defaultValue={initial?.referenceNumber ?? ""}
            className={paperInput}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="description" className={paperLabel}>
            Description
          </Label>
          <Input
            id="description"
            name="description"
            defaultValue={initial?.description ?? ""}
            className={paperInput}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="notes" className={paperLabel}>
            Notes
          </Label>
          <textarea
            id="notes"
            name="notes"
            rows={4}
            defaultValue={initial?.notes ?? ""}
            placeholder="Optional notes"
            className={paperTextarea}
          />
        </div>
        <input type="hidden" name="visibility" value="PROJECT_SHARED" />
      </div>

      <Button
        type="submit"
        disabled={pending}
        className={cn(paperButton, "w-full sm:w-auto")}
      >
        {pending
          ? "Saving…"
          : transactionId
            ? "Save changes"
            : "Record transaction"}
      </Button>
    </form>
  );
}

function labelForType(type: string): string {
  switch (type) {
    case "DISBURSEMENT":
      return "Disbursement";
    case "DEBIT_CONSTRUCTION":
      return "Debit · construction";
    case "DEBIT_OTHER":
      return "Debit · other (rotational)";
    case "CREDIT_REPAYMENT":
      return "Credit · repayment";
    default:
      return type;
  }
}
