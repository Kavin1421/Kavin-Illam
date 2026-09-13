import type { Metadata } from "next";
import Link from "next/link";

import { CreateAdvanceForm } from "@/components/advances/advance-forms";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { listAccounts } from "@/server/finance/accounts";
import { listCategoriesForProject } from "@/server/finance/categories";

export const metadata: Metadata = {
  title: "Issue advance",
};

export default async function NewAdvancePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [accounts, categories] = await Promise.all([
    listAccounts(slug),
    listCategoriesForProject(slug),
  ]);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8 sm:px-6">
      <div className="space-y-1">
        <h2 className="font-heading text-2xl tracking-tight">Issue advance</h2>
        <p className="text-muted-foreground text-sm">
          Creates an advance record and a linked ledger ADVANCE transaction.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Advance details</CardTitle>
          <CardDescription>
            Outstanding starts equal to the original amount.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CreateAdvanceForm
            slug={slug}
            accounts={accounts.map((a) => ({ id: a.id, name: a.name }))}
            categories={categories.map((c) => ({ id: c.id, name: c.name }))}
          />
        </CardContent>
      </Card>

      <Link
        href={`/p/${slug}/advances`}
        className="text-muted-foreground text-sm underline-offset-4 hover:underline"
      >
        Back to advances
      </Link>
    </div>
  );
}
