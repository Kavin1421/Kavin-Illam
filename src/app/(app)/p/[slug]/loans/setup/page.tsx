import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LoanFacilityForm } from "@/components/loans/loan-forms";
import { LoanPaperShell } from "@/components/loans/loan-paper-shell";
import { rupeeInputFromPaise } from "@/lib/money";
import { roleHasPermission } from "@/server/authorization";
import { getLoanOverview } from "@/server/loans/service";

export const metadata: Metadata = {
  title: "Home loan setup",
};

export default async function LoanSetupPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { role, facility } = await getLoanOverview(slug);
  const isEdit = Boolean(facility);
  const canWrite = roleHasPermission(
    role,
    isEdit ? "LOAN_EDIT" : "LOAN_CREATE",
  );
  if (!canWrite) notFound();

  return (
    <LoanPaperShell
      eyebrow="Home loan"
      title={isEdit ? "Edit facility" : "Create facility"}
      description="Enter the sanctioned principal, rate, and tenure. This wallet stays separate from construction Finance."
      backHref={`/p/${slug}/loans`}
    >
      <LoanFacilityForm
        slug={slug}
        mode={isEdit ? "edit" : "create"}
        initial={
          facility
            ? {
                lenderName: facility.lenderName,
                sanctionedRupees: rupeeInputFromPaise(
                  facility.sanctionedAmount,
                ),
                interestRatePercent:
                  facility.interestRateBps != null
                    ? (facility.interestRateBps / 100).toFixed(2)
                    : "",
                tenureMonths:
                  facility.tenureMonths != null
                    ? String(facility.tenureMonths)
                    : "",
                notes: facility.notes,
              }
            : undefined
        }
      />
    </LoanPaperShell>
  );
}
