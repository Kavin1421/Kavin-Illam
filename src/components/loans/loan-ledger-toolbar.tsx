"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { sendOpenDiversionRemindersAction } from "@/server/loans/actions";
import { OPEN_DIVERSION_REMINDER_DAYS } from "@/validators/loans";

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

export function LoanLedgerToolbar({
  slug,
  overdueCount,
  canRemind,
  initial,
}: {
  slug: string;
  overdueCount: number;
  canRemind: boolean;
  initial: {
    filter: string;
    q: string;
    method: string;
    from: string;
    to: string;
    year: number;
    month: number;
  };
}) {
  const router = useRouter();
  const [pendingRemind, startRemind] = useTransition();
  const [downloading, setDownloading] = useState(false);
  const [year, setYear] = useState(String(initial.year));
  const [month, setMonth] = useState(String(initial.month));

  function onFilterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const params = new URLSearchParams();
    const filter = String(form.get("filter") || "all");
    const q = String(form.get("q") || "").trim();
    const method = String(form.get("method") || "").trim();
    const from = String(form.get("from") || "").trim();
    const to = String(form.get("to") || "").trim();
    if (filter && filter !== "all") params.set("filter", filter);
    if (q) params.set("q", q);
    if (method) params.set("method", method);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const qs = params.toString();
    router.push(qs ? `/p/${slug}/loans?${qs}` : `/p/${slug}/loans`);
  }

  async function downloadStatement() {
    setDownloading(true);
    try {
      const res = await fetch(
        `/api/p/${slug}/loans/statement/pdf?year=${encodeURIComponent(year)}&month=${encodeURIComponent(month)}`,
      );
      if (!res.ok) throw new Error("Could not download statement.");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = /filename="([^"]+)"/.exec(disposition);
      anchor.href = url;
      anchor.download = match?.[1] ?? `loan-statement-${year}-${month}.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success("Loan statement downloaded.");
    } catch {
      toast.error("Could not download the statement PDF.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="space-y-4 border-b border-slate-100 px-4 py-4 sm:px-5">
      <form
        onSubmit={onFilterSubmit}
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6"
      >
        <input type="hidden" name="filter" value={initial.filter} />
        <div className="space-y-1 lg:col-span-2">
          <label htmlFor="q" className="text-xs font-medium text-slate-600">
            Search
          </label>
          <Input
            id="q"
            name="q"
            defaultValue={initial.q}
            placeholder="UTR, paid to, description…"
            className="h-9 border-slate-200 bg-slate-50 text-slate-900"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="method" className="text-xs font-medium text-slate-600">
            Method
          </label>
          <select
            id="method"
            name="method"
            defaultValue={initial.method}
            className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-sm text-slate-900"
          >
            <option value="">Any</option>
            {METHODS.map((method) => (
              <option key={method} value={method}>
                {method.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="from" className="text-xs font-medium text-slate-600">
            From
          </label>
          <Input
            id="from"
            name="from"
            type="date"
            defaultValue={initial.from}
            className="h-9 border-slate-200 bg-slate-50 text-slate-900"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="to" className="text-xs font-medium text-slate-600">
            To
          </label>
          <Input
            id="to"
            name="to"
            type="date"
            defaultValue={initial.to}
            className="h-9 border-slate-200 bg-slate-50 text-slate-900"
          />
        </div>
        <div className="flex items-end gap-2">
          <Button type="submit" className="h-9 bg-emerald-700 text-white hover:bg-emerald-800">
            Apply
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-9"
            onClick={() => router.push(`/p/${slug}/loans`)}
          >
            Clear
          </Button>
        </div>
      </form>

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label htmlFor="statementMonth" className="text-xs font-medium text-slate-600">
            Monthly statement
          </label>
          <div className="flex flex-wrap gap-2">
            <select
              id="statementMonth"
              value={month}
              onChange={(event) => setMonth(event.target.value)}
              className="h-9 rounded-lg border border-slate-200 bg-slate-50 px-2 text-sm text-slate-900"
            >
              {Array.from({ length: 12 }, (_, index) => {
                const value = String(index + 1);
                const label = new Date(2026, index, 1).toLocaleString("en-IN", {
                  month: "short",
                });
                return (
                  <option key={value} value={value}>
                    {label}
                  </option>
                );
              })}
            </select>
            <Input
              type="number"
              min={2000}
              max={2100}
              value={year}
              onChange={(event) => setYear(event.target.value)}
              className="h-9 w-24 border-slate-200 bg-slate-50 text-slate-900"
            />
            <Button
              type="button"
              variant="outline"
              className="h-9"
              disabled={downloading}
              onClick={() => void downloadStatement()}
            >
              {downloading ? "Preparing…" : "Download PDF"}
            </Button>
          </div>
        </div>

        {canRemind && overdueCount > 0 ? (
          <Button
            type="button"
            variant="outline"
            className="h-9 border-amber-300 text-amber-900"
            disabled={pendingRemind}
            onClick={() => {
              startRemind(async () => {
                const result = await sendOpenDiversionRemindersAction(slug);
                if (result.error) {
                  toast.error(result.error);
                  return;
                }
                toast.success(result.success ?? "Reminder sent.");
              });
            }}
          >
            {pendingRemind
              ? "Sending…"
              : `Email reminder (${overdueCount} open ${OPEN_DIVERSION_REMINDER_DAYS}+ days)`}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
