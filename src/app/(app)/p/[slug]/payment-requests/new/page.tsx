import type { Metadata } from "next";
import Link from "next/link";

import { CreatePaymentRequestForm } from "@/components/payments/payment-request-forms";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { listCategoriesForProject } from "@/server/finance/categories";

export const metadata: Metadata = {
  title: "New payment request",
};

export default async function NewPaymentRequestPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const categories = await listCategoriesForProject(slug);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8 sm:px-6">
      <div className="space-y-1">
        <h2 className="font-heading text-2xl tracking-tight">
          New payment request
        </h2>
        <p className="text-muted-foreground text-sm">
          Submits for owner/accountant approval. Payment creates a linked ledger
          expense — never a silent duplicate.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Request details</CardTitle>
          <CardDescription>Starts in PENDING status.</CardDescription>
        </CardHeader>
        <CardContent>
          <CreatePaymentRequestForm
            slug={slug}
            categories={categories.map((c) => ({ id: c.id, name: c.name }))}
          />
        </CardContent>
      </Card>

      <Link
        href={`/p/${slug}/payment-requests`}
        className="text-muted-foreground text-sm underline-offset-4 hover:underline"
      >
        Back to payment requests
      </Link>
    </div>
  );
}
