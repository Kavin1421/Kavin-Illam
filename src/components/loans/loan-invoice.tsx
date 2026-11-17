"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";

import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate, formatDateTime } from "@/lib/dates";
import { formatInrFromPaise } from "@/lib/money";
import { cn } from "@/lib/utils";
import { emailLoanReceiptAction } from "@/server/loans/receipt-actions";

type Party = { name?: string | null; email?: string | null };

export type LoanInvoiceProps = {
  slug: string;
  projectName: string;
  emailConfigured: boolean;
  defaultRecipientEmail?: string | null;
  facility: {
    lenderName?: string | null;
    sanctionedAmount: number;
  };
  transaction: {
    id: string;
    loanNumber: string;
    type: string;
    amount: number;
    currency: string;
    paidTo?: string | null;
    paymentMethod?: string | null;
    referenceNumber?: string | null;
    description?: string | null;
    notes?: string | null;
    transactionDate: Date | string;
    createdAt: Date | string;
    repaid?: number;
    outstanding?: number;
    rotationalStatus?: string | null;
    createdBy: Party;
    linkedDebit?: {
      id: string;
      loanNumber: string;
      amount: number;
      description?: string | null;
      paidTo?: string | null;
    } | null;
    repayments?: Array<{
      id: string;
      loanNumber: string;
      amount: number;
      transactionDate: Date | string;
      description?: string | null;
    }>;
    proofDocuments?: Array<{
      id: string;
      title: string;
      documentNumber: string;
      fileName: string;
      mimeType?: string | null;
    }>;
    proofDocument?: {
      id: string;
      title: string;
      documentNumber: string;
      fileName: string;
      mimeType?: string | null;
    } | null;
  };
};

function typeTitle(type: string): string {
  switch (type) {
    case "DISBURSEMENT":
      return "Loan disbursement";
    case "DEBIT_CONSTRUCTION":
      return "Construction debit";
    case "DEBIT_OTHER":
      return "Rotational debit";
    case "CREDIT_REPAYMENT":
      return "Rotational repayment";
    default:
      return "Loan receipt";
  }
}

function statusTone(status?: string | null): string {
  if (status === "REPAID") {
    return "bg-emerald-100 text-emerald-800 border-emerald-200";
  }
  if (status === "PARTIALLY_REPAID") {
    return "bg-amber-100 text-amber-900 border-amber-200";
  }
  if (status === "OPEN") {
    return "bg-orange-100 text-orange-900 border-orange-200";
  }
  return "bg-slate-100 text-slate-700 border-slate-200";
}

export function LoanInvoice({
  slug,
  projectName,
  emailConfigured,
  defaultRecipientEmail,
  facility,
  transaction,
}: LoanInvoiceProps) {
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [pendingPrint, startPrint] = useTransition();
  const [sending, startSend] = useTransition();

  const amountLabel = formatInrFromPaise(transaction.amount);
  const progress =
    transaction.type === "DEBIT_OTHER" && transaction.amount > 0
      ? Math.min(
          100,
          Math.round(((transaction.repaid ?? 0) / transaction.amount) * 100),
        )
      : null;
  const proofDocuments =
    transaction.proofDocuments && transaction.proofDocuments.length > 0
      ? transaction.proofDocuments
      : transaction.proofDocument
        ? [transaction.proofDocument]
        : [];

  async function downloadPdf() {
    setDownloading(true);
    try {
      const res = await fetch(`/api/p/${slug}/loans/${transaction.id}/pdf`);
      if (!res.ok) {
        throw new Error("Could not download PDF.");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = /filename="([^"]+)"/.exec(disposition);
      anchor.href = url;
      anchor.download = match?.[1] ?? `${transaction.loanNumber}.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success("Receipt PDF downloaded.");
    } catch {
      toast.error("Could not download the PDF.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <article className="overflow-hidden rounded-[28px] border border-[#d7e4df] bg-[#f7faf8] shadow-[0_24px_60px_rgba(2,44,34,0.12)]">
      <div
        className="flex flex-wrap items-center justify-end gap-2 border-b border-[#e2e8e5] bg-white/80 px-4 py-3 sm:px-6"
        data-print-hide
      >
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pendingPrint}
          onClick={() => startPrint(() => window.print())}
        >
          Print
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={downloading}
          onClick={() => void downloadPdf()}
        >
          {downloading ? "Preparing…" : "Download PDF"}
        </Button>
        {emailConfigured ? (
          <Button
            type="button"
            size="sm"
            onClick={() => {
              setEmailError(null);
              setEmailOpen(true);
            }}
          >
            Email
          </Button>
        ) : null}
      </div>

      <div className="space-y-6 bg-white px-5 py-7 sm:px-8 sm:py-9">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] tracking-[0.16em] text-[#667085] uppercase">
              Kavin Illam · Home loan
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#063f3a]">
              {typeTitle(transaction.type)}
            </h1>
            <p className="mt-1 font-mono text-sm text-[#475569]">
              {transaction.loanNumber}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-[#667085]">{projectName}</p>
            {facility.lenderName ? (
              <p className="text-sm font-medium text-[#17202a]">
                {facility.lenderName}
              </p>
            ) : null}
            {transaction.rotationalStatus ? (
              <span
                className={cn(
                  "mt-2 inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold tracking-wide uppercase",
                  statusTone(transaction.rotationalStatus),
                )}
              >
                {transaction.rotationalStatus.replaceAll("_", " ")}
              </span>
            ) : null}
          </div>
        </header>

        <section className="rounded-2xl border border-[#dce8e3] bg-[#f3faf6] px-5 py-6 text-center">
          <p className="text-[11px] tracking-[0.16em] text-[#667085] uppercase">
            Amount
          </p>
          <p className="mt-2 text-4xl font-bold tracking-tight text-[#064e46]">
            {amountLabel}
          </p>
          <p className="mt-2 text-sm text-[#667085]">
            {transaction.currency} · {formatDate(transaction.transactionDate)}
          </p>
        </section>

        {transaction.type === "DEBIT_OTHER" ? (
          <section className="space-y-3 rounded-2xl border border-[#ead9b4] bg-[#fffbf2] px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-[#7c5a12]">
                Rotational repayment progress
              </p>
              <p className="text-sm text-[#7c5a12]">
                {formatInrFromPaise(transaction.repaid ?? 0)} repaid ·{" "}
                {formatInrFromPaise(transaction.outstanding ?? 0)} open
              </p>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[#f3e6c8]">
              <div
                className="h-full rounded-full bg-[#d4a017]"
                style={{ width: `${progress ?? 0}%` }}
              />
            </div>
            {(transaction.repayments ?? []).length > 0 ? (
              <ul className="space-y-2 pt-1">
                {transaction.repayments!.map((row) => (
                  <li key={row.id}>
                    <Link
                      href={`/p/${slug}/loans/${row.id}`}
                      className="flex items-center justify-between gap-3 text-sm text-[#063f3a] hover:underline"
                    >
                      <span>
                        {row.loanNumber} · {formatDate(row.transactionDate)}
                      </span>
                      <span className="font-medium">
                        {formatInrFromPaise(row.amount)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-[#9a741f]">
                No repayment credited yet. Credit this diversion when you put
                the money back into the loan account.
              </p>
            )}
          </section>
        ) : null}

        {transaction.type === "CREDIT_REPAYMENT" && transaction.linkedDebit ? (
          <section className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4">
            <p className="text-[11px] tracking-[0.14em] text-emerald-800 uppercase">
              Linked diversion
            </p>
            <Link
              href={`/p/${slug}/loans/${transaction.linkedDebit.id}`}
              className="mt-1 block text-sm font-medium text-emerald-950 hover:underline"
            >
              {transaction.linkedDebit.loanNumber} ·{" "}
              {formatInrFromPaise(transaction.linkedDebit.amount)}
              {transaction.linkedDebit.paidTo
                ? ` · ${transaction.linkedDebit.paidTo}`
                : ""}
            </Link>
            {transaction.linkedDebit.description ? (
              <p className="mt-1 text-sm text-emerald-900/80">
                {transaction.linkedDebit.description}
              </p>
            ) : null}
            <p className="mt-2 text-sm text-emerald-900">
              Remaining open on diversion:{" "}
              {formatInrFromPaise(transaction.outstanding ?? 0)}
            </p>
          </section>
        ) : null}

        <section className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-3">
            <p className="text-[11px] tracking-[0.14em] text-[#667085] uppercase">
              Details
            </p>
            <MetaRow label="Receipt ID" value={transaction.loanNumber} />
            <MetaRow label="Type" value={typeTitle(transaction.type)} />
            <MetaRow
              label="Method"
              value={
                transaction.paymentMethod?.replaceAll("_", " ") ?? "—"
              }
            />
            <MetaRow
              label="Reference"
              value={transaction.referenceNumber || "—"}
            />
          </div>
          <div className="space-y-3">
            <p className="text-[11px] tracking-[0.14em] text-[#667085] uppercase">
              Record
            </p>
            <MetaRow
              label="Paid to / from"
              value={transaction.paidTo || "—"}
            />
            <MetaRow
              label="Recorded by"
              value={
                transaction.createdBy.name ||
                transaction.createdBy.email ||
                "—"
              }
            />
            <MetaRow
              label="Recorded at"
              value={formatDateTime(transaction.createdAt)}
            />
            <MetaRow
              label="Sanctioned"
              value={formatInrFromPaise(facility.sanctionedAmount)}
            />
          </div>
        </section>

        {transaction.description ? (
          <section className="rounded-xl border border-[#e2e8e5] bg-[#f8faf9] px-4 py-3">
            <p className="text-[11px] tracking-[0.14em] text-[#667085] uppercase">
              Description
            </p>
            <p className="mt-1 text-sm text-[#17202a]">
              {transaction.description}
            </p>
          </section>
        ) : null}

        {transaction.notes ? (
          <section>
            <p className="text-[11px] tracking-[0.14em] text-[#667085] uppercase">
              Notes
            </p>
            <p className="mt-1 text-sm text-[#667085]">{transaction.notes}</p>
          </section>
        ) : null}

        {proofDocuments.length > 0 ? (
          <section className="space-y-2" data-print-hide>
            <p className="text-[11px] tracking-[0.14em] text-[#667085] uppercase">
              Payment screenshots
            </p>
            <ul className="space-y-1.5">
              {proofDocuments.map((doc, index) => (
                <li key={doc.id}>
                  <Link
                    href={`/p/${slug}/documents/${doc.id}`}
                    className={cn(
                      buttonVariants({ variant: "outline", size: "sm" }),
                      "border-[#d0ddd8] text-[#063f3a] hover:bg-[#eef7f2]",
                    )}
                  >
                    {proofDocuments.length > 1
                      ? `${index + 1}. ${doc.fileName}`
                      : "View payment screenshot"}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <p className="text-xs text-[#667085]" data-print-hide>
            {transaction.paymentMethod === "CASH"
              ? "Cash payment — no screenshot required."
              : "No payment screenshot attached."}
          </p>
        )}
      </div>

      {emailOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-4 backdrop-blur-sm sm:items-center"
          role="dialog"
          aria-modal="true"
          data-print-hide
          onClick={() => setEmailOpen(false)}
        >
          <div
            className="w-full max-w-lg space-y-4 rounded-2xl border border-white/10 bg-[#04352d] p-5 text-white shadow-2xl sm:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="text-xl font-semibold">Email loan receipt</h2>
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                const formData = new FormData(event.currentTarget);
                startSend(async () => {
                  const result = await emailLoanReceiptAction(
                    slug,
                    transaction.id,
                    {},
                    formData,
                  );
                  if (result.error) {
                    setEmailError(result.error);
                    return;
                  }
                  setEmailOpen(false);
                  toast.success(result.success ?? "Email sent.");
                });
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="to">To</Label>
                <Input
                  id="to"
                  name="to"
                  type="email"
                  required
                  defaultValue={defaultRecipientEmail ?? ""}
                  className="bg-white text-slate-900"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  name="subject"
                  required
                  defaultValue={`Home loan receipt ${transaction.loanNumber}`}
                  className="bg-white text-slate-900"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <textarea
                  id="message"
                  name="message"
                  required
                  rows={4}
                  defaultValue={`Please find the Home Loan receipt ${transaction.loanNumber} attached.`}
                  className="w-full rounded-md border border-white/20 bg-white px-3 py-2 text-sm text-slate-900"
                />
              </div>
              {emailError ? (
                <p className="text-sm text-red-300">{emailError}</p>
              ) : null}
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEmailOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={sending}>
                  {sending ? "Sending…" : "Send"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </article>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-[#eef2f0] py-2 text-sm">
      <span className="text-[#667085]">{label}</span>
      <span className="max-w-[60%] text-right font-medium text-[#17202a]">
        {value}
      </span>
    </div>
  );
}
