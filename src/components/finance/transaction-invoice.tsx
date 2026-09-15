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
import { emailPaymentReceiptAction } from "@/server/finance/receipt-actions";

type InvoiceParty = {
  name?: string | null;
  email?: string | null;
};

type InvoiceProof = {
  id: string;
  title: string;
  documentNumber: string;
  fileName: string;
};

export type TransactionInvoiceProps = {
  slug: string;
  projectName: string;
  projectType?: string | null;
  emailConfigured: boolean;
  defaultRecipientEmail?: string | null;
  transaction: {
    id: string;
    transactionNumber: string;
    type: string;
    status: string;
    amount: number;
    currency: string;
    paidTo?: string | null;
    paymentMethod?: string | null;
    referenceNumber?: string | null;
    description?: string | null;
    notes?: string | null;
    transactionDate: Date | string;
    createdAt: Date | string;
    category?: { name: string } | null;
    account?: { name: string } | null;
    createdBy: InvoiceParty;
    paidBy?: InvoiceParty | null;
    proofDocument?: InvoiceProof | null;
    proofDocuments?: InvoiceProof[];
  };
};

function methodLabel(method?: string | null): string {
  if (!method) return "—";
  return method.replaceAll("_", " ");
}

function statusTone(status: string): string {
  const value = status.toUpperCase();
  if (value === "PAID" || value === "APPROVED") {
    return "bg-emerald-100 text-emerald-800 border-emerald-200";
  }
  if (value === "PENDING" || value === "DRAFT") {
    return "bg-amber-100 text-amber-900 border-amber-200";
  }
  if (value === "CANCELLED" || value === "REJECTED") {
    return "bg-red-100 text-red-800 border-red-200";
  }
  if (value === "REFUNDED") {
    return "bg-cyan-100 text-cyan-900 border-cyan-200";
  }
  return "bg-slate-100 text-slate-700 border-slate-200";
}

/**
 * Premium light-paper payment receipt with print / email / share actions.
 */
export function TransactionInvoice({
  slug,
  projectName,
  projectType,
  emailConfigured,
  defaultRecipientEmail,
  transaction,
}: TransactionInvoiceProps) {
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadDone, setDownloadDone] = useState(false);
  const [pendingPrint, startPrint] = useTransition();
  const [sending, startSend] = useTransition();

  const payer =
    transaction.paidBy?.name ||
    transaction.paidBy?.email ||
    transaction.createdBy.name ||
    transaction.createdBy.email ||
    "—";

  const amountLabel = formatInrFromPaise(transaction.amount);
  const proofDocuments =
    transaction.proofDocuments && transaction.proofDocuments.length > 0
      ? transaction.proofDocuments
      : transaction.proofDocument
        ? [transaction.proofDocument]
        : [];
  const txDate =
    typeof transaction.transactionDate === "string"
      ? new Date(transaction.transactionDate)
      : transaction.transactionDate;
  const createdAt =
    typeof transaction.createdAt === "string"
      ? new Date(transaction.createdAt)
      : transaction.createdAt;

  const defaultSubject = `Payment Receipt — ${projectName} — ${amountLabel}`;
  const defaultMessage = `Hello,\n\nPlease find the payment receipt for the ${projectName} project.\n\nAmount: ${amountLabel}\nReceipt: ${transaction.transactionNumber}\n\nRegards`;

  function onPrint() {
    startPrint(() => {
      toast.message("Opening print dialog…");
      window.setTimeout(() => window.print(), 120);
    });
  }

  async function onDownloadPdf() {
    if (downloading) return;
    setDownloading(true);
    setDownloadDone(false);
    toast.message("Preparing your receipt…");

    try {
      const response = await fetch(
        `/api/p/${slug}/finance/${transaction.id}/pdf`,
        { method: "GET", credentials: "same-origin" },
      );

      if (!response.ok) {
        let message = "Unable to generate receipt.";
        try {
          const body = (await response.json()) as { error?: string };
          if (body.error) message = body.error;
        } catch {
          // keep default message
        }
        throw new Error(message);
      }

      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition") ?? "";
      const match = /filename="([^"]+)"/i.exec(disposition);
      const fileName =
        match?.[1] ??
        `Kavin-Illam-Payment-Receipt-${transaction.transactionNumber}.pdf`;

      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = fileName;
      anchor.rel = "noopener";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);

      setDownloadDone(true);
      toast.success("Receipt downloaded");
      window.setTimeout(() => setDownloadDone(false), 2000);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to generate receipt. Please try again.",
      );
    } finally {
      setDownloading(false);
    }
  }

  async function onCopyId() {
    try {
      await navigator.clipboard.writeText(transaction.transactionNumber);
      toast.success("Receipt ID copied");
    } catch {
      toast.error("Could not copy receipt ID");
    }
  }

  function onEmailSubmit(formData: FormData) {
    setEmailError(null);
    startSend(async () => {
      const result = await emailPaymentReceiptAction(
        slug,
        transaction.id,
        {},
        formData,
      );
      if (result.success) {
        toast.success(result.success);
        setEmailOpen(false);
        return;
      }
      const message = result.error ?? "Unable to send receipt.";
      setEmailError(message);
      toast.error(message);
    });
  }

  return (
    <div className="animate-page-in space-y-5">
      <div
        data-print-hide
        className="flex flex-wrap items-center justify-between gap-3"
      >
        <div className="space-y-1">
          <p className="text-muted-foreground text-xs tracking-[0.16em] uppercase">
            Finance / Invoice
          </p>
          <h1 className="font-heading text-2xl tracking-tight text-white">
            Payment receipt
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={onDownloadPdf}
            disabled={downloading}
            aria-label="Download transaction receipt as PDF"
          >
            {downloading
              ? "Generating PDF…"
              : downloadDone
                ? "Downloaded ✓"
                : "Download PDF"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setEmailError(null);
              setEmailOpen(true);
            }}
            disabled={!emailConfigured}
            aria-label="Email transaction receipt"
            title={
              emailConfigured
                ? "Email this receipt"
                : "Email is not configured on this server"
            }
          >
            Email receipt
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={onPrint}
            disabled={pendingPrint}
            aria-label="Print transaction receipt"
          >
            Print
          </Button>
          <Button type="button" variant="ghost" onClick={onCopyId}>
            Copy ID
          </Button>
        </div>
      </div>

      <article
        className="invoice-paper invoice-sheet mx-auto w-full max-w-[820px] overflow-hidden rounded-[1.1rem] border border-[color:var(--ki-invoice-border)] bg-[color:var(--ki-invoice-paper)] text-[color:var(--ki-invoice-ink)] shadow-[var(--ki-invoice-shadow)]"
        aria-label={`Invoice ${transaction.transactionNumber}`}
      >
        <div className="h-[3px] bg-gradient-to-r from-[#008f62] via-[#00c875] to-[#5eead4]" />

        <div className="space-y-8 p-6 sm:p-10">
          <header className="flex flex-wrap items-start justify-between gap-6">
            <div className="flex items-start gap-3">
              <div className="flex size-11 items-center justify-center rounded-xl bg-[#063f3a] font-heading text-sm font-semibold text-[#5eead4]">
                KI
              </div>
              <div>
                <p className="font-heading text-xl tracking-tight text-[#063f3a]">
                  Kavin Illam
                </p>
                <p className="text-xs tracking-[0.14em] text-[#667085] uppercase">
                  Build · Track · Manage
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs tracking-[0.18em] text-[#667085] uppercase">
                Payment receipt
              </p>
              <p className="mt-1 font-mono text-sm text-[#17202a]">
                {transaction.transactionNumber}
              </p>
              <span
                className={cn(
                  "mt-2 inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-medium tracking-wide uppercase",
                  statusTone(transaction.status),
                )}
              >
                {transaction.status}
              </span>
            </div>
          </header>

          <section className="rounded-2xl border border-[#e2e8e5] bg-white px-5 py-6 text-center sm:px-8">
            <p className="text-[11px] tracking-[0.2em] text-[#667085] uppercase">
              Amount paid
            </p>
            <p className="font-heading mt-2 text-4xl tracking-tight text-[#063f3a] sm:text-5xl">
              {amountLabel}
            </p>
            <p className="mt-2 text-sm text-[#667085]">
              {transaction.currency} · {formatDate(txDate)}
            </p>
          </section>

          <div className="grid gap-8 sm:grid-cols-2">
            <section className="space-y-3">
              <p className="text-[11px] tracking-[0.16em] text-[#667085] uppercase">
                Bill to / paid to
              </p>
              <p className="text-lg font-medium text-[#17202a]">
                {transaction.paidTo || "Not specified"}
              </p>
              <dl className="space-y-2 text-sm text-[#667085]">
                <div className="flex justify-between gap-3 border-b border-[#eef2f0] pb-2">
                  <dt>Project</dt>
                  <dd className="text-right text-[#17202a]">{projectName}</dd>
                </div>
                <div className="flex justify-between gap-3 border-b border-[#eef2f0] pb-2">
                  <dt>Category</dt>
                  <dd className="text-right text-[#17202a]">
                    {transaction.category?.name ?? "—"}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>Account</dt>
                  <dd className="text-right text-[#17202a]">
                    {transaction.account?.name ?? "—"}
                  </dd>
                </div>
              </dl>
            </section>

            <section className="space-y-3">
              <p className="text-[11px] tracking-[0.16em] text-[#667085] uppercase">
                Payment details
              </p>
              <dl className="space-y-2 text-sm text-[#667085]">
                <div className="flex justify-between gap-3 border-b border-[#eef2f0] pb-2">
                  <dt>Method</dt>
                  <dd className="text-right text-[#17202a]">
                    {methodLabel(transaction.paymentMethod)}
                  </dd>
                </div>
                <div className="flex justify-between gap-3 border-b border-[#eef2f0] pb-2">
                  <dt>Reference / UTR</dt>
                  <dd className="text-right font-mono text-xs text-[#17202a]">
                    {transaction.referenceNumber || "—"}
                  </dd>
                </div>
                <div className="flex justify-between gap-3 border-b border-[#eef2f0] pb-2">
                  <dt>Recorded by</dt>
                  <dd className="text-right text-[#17202a]">{payer}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>Recorded at</dt>
                  <dd className="text-right text-[#17202a]">
                    {formatDateTime(createdAt)}
                  </dd>
                </div>
              </dl>
            </section>
          </div>

          {transaction.description || transaction.notes ? (
            <section className="space-y-2 rounded-xl border border-[#e2e8e5] bg-[#fbfcfb] px-4 py-3">
              {transaction.description ? (
                <>
                  <p className="text-[11px] tracking-[0.14em] text-[#667085] uppercase">
                    Description
                  </p>
                  <p className="text-sm text-[#17202a]">
                    {transaction.description}
                  </p>
                </>
              ) : null}
              {transaction.notes ? (
                <>
                  <p className="pt-2 text-[11px] tracking-[0.14em] text-[#667085] uppercase">
                    Notes
                  </p>
                  <p className="text-sm text-[#667085]">{transaction.notes}</p>
                </>
              ) : null}
            </section>
          ) : null}

          <section className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e2e8e5] pt-5">
            <div>
              <p className="text-[11px] tracking-[0.14em] text-[#667085] uppercase">
                Project
              </p>
              <p className="text-sm font-medium text-[#17202a]">{projectName}</p>
              <p className="text-xs text-[#667085]">
                {(projectType ?? "RESIDENTIAL").replaceAll("_", " ")}{" "}
                construction
              </p>
            </div>
            {proofDocuments.length > 0 ? (
              <div className="space-y-2" data-print-hide>
                <p className="text-[11px] tracking-[0.14em] text-[#667085] uppercase">
                  Payment proof
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
                          : "View payment proof"}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-xs text-[#667085]" data-print-hide>
                {transaction.paymentMethod === "CASH"
                  ? "Cash payment — no screenshot required."
                  : "No payment proof attached."}
              </p>
            )}
          </section>

          <footer className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#86a8a3]">
            <p>Generated from Kavin Illam project ledger</p>
            <p className="font-mono">{transaction.transactionNumber}</p>
          </footer>
        </div>
      </article>

      {emailOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-4 backdrop-blur-sm sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label="Email payment receipt"
          data-print-hide
          onClick={() => setEmailOpen(false)}
          onKeyDown={(event) => {
            if (event.key === "Escape") setEmailOpen(false);
          }}
        >
          <div
            className="surface-elevated w-full max-w-lg space-y-4 p-5 sm:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div>
              <h2 className="font-heading text-xl text-white">
                Email payment receipt
              </h2>
              <p className="text-muted-foreground mt-1 text-sm">
                Generates the same PDF receipt and attaches it to the email.
              </p>
            </div>
            <form action={onEmailSubmit} className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="to">To</Label>
                <Input
                  id="to"
                  name="to"
                  type="email"
                  required
                  defaultValue={defaultRecipientEmail ?? ""}
                  placeholder="recipient@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  name="subject"
                  required
                  defaultValue={defaultSubject}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <textarea
                  id="message"
                  name="message"
                  required
                  rows={5}
                  defaultValue={defaultMessage}
                  className="border-input bg-background min-h-[7rem] w-full rounded-lg border px-3 py-2 text-sm text-white"
                />
              </div>
              <p className="text-muted-foreground text-xs">
                Attachment: Kavin-Illam-Payment-Receipt-
                {transaction.transactionNumber}.pdf
              </p>
              {emailError ? (
                <p className="text-destructive text-sm" role="alert">
                  {emailError}
                </p>
              ) : null}
              <div className="flex flex-wrap justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setEmailOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={sending}>
                  {sending ? "Sending…" : "Send receipt"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
