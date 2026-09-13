import type { Metadata } from "next";
import Link from "next/link";

import { CreateAccountForm } from "@/components/finance/finance-forms";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatInrFromPaise } from "@/lib/money";
import { roleHasPermission } from "@/server/authorization";
import { listAccounts } from "@/server/finance/accounts";
import { requireProjectPermissionBySlug } from "@/server/authorization";

export const metadata: Metadata = {
  title: "Accounts",
};

export default async function FinanceAccountsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ctx = await requireProjectPermissionBySlug(slug, "FINANCE_VIEW");
  const accounts = await listAccounts(slug);
  const canCreate = roleHasPermission(ctx.role, "FINANCE_CREATE");

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8 sm:px-6">
      <div className="space-y-1">
        <h2 className="font-heading text-2xl tracking-tight">Accounts</h2>
        <p className="text-muted-foreground text-sm">
          Never store full bank credentials or card CVV.
        </p>
        <Link
          href={`/p/${slug}/finance`}
          className="text-muted-foreground text-sm underline-offset-4 hover:underline"
        >
          Back to finance
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Project accounts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {accounts.length === 0 ? (
            <p className="text-muted-foreground text-sm">No accounts yet.</p>
          ) : (
            accounts.map((account) => (
              <div
                key={account.id}
                className="border-border rounded-lg border p-3"
              >
                <p className="font-medium">{account.name}</p>
                <p className="text-muted-foreground text-sm">
                  {account.type}
                  {account.institution ? ` · ${account.institution}` : ""}
                  {account.maskedIdentifier
                    ? ` · ${account.maskedIdentifier}`
                    : ""}
                </p>
                <p className="text-sm">
                  Opening: {formatInrFromPaise(account.openingBalance)}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {canCreate ? (
        <Card>
          <CardHeader>
            <CardTitle>Add account</CardTitle>
            <CardDescription>Bank, cash, UPI, or other.</CardDescription>
          </CardHeader>
          <CardContent>
            <CreateAccountForm slug={slug} />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
