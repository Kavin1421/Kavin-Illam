import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDate } from "@/lib/dates";
import { formatInrFromPaise } from "@/lib/money";
import { cn } from "@/lib/utils";
import { listAdvances } from "@/server/advances/service";
import { roleHasPermission } from "@/server/authorization";

export const metadata: Metadata = {
  title: "Advances",
};

export default async function AdvancesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { role, advances, totals } = await listAdvances(slug);
  const canCreate = roleHasPermission(role, "FINANCE_CREATE");

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h2 className="font-heading text-2xl tracking-tight">Advances</h2>
          <p className="text-muted-foreground text-sm">
            Outstanding balances are computed only on the server.
          </p>
        </div>
        {canCreate ? (
          <Link
            href={`/p/${slug}/advances/new`}
            className={cn(buttonVariants())}
          >
            Issue advance
          </Link>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total original</CardDescription>
            <CardTitle className="text-xl">
              {formatInrFromPaise(totals.totalOriginal)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Outstanding</CardDescription>
            <CardTitle className="text-xl">
              {formatInrFromPaise(totals.totalOutstanding)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {advances.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No advances yet</CardTitle>
            <CardDescription>
              Issue an advance to track principal, settlements, and refunds.
            </CardDescription>
          </CardHeader>
          {canCreate ? (
            <CardContent>
              <Link
                href={`/p/${slug}/advances/new`}
                className={cn(buttonVariants())}
              >
                Issue first advance
              </Link>
            </CardContent>
          ) : null}
        </Card>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-lg border md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/40 border-b">
                <tr>
                  <th className="px-3 py-2 font-medium">Issued</th>
                  <th className="px-3 py-2 font-medium">Number</th>
                  <th className="px-3 py-2 font-medium">Recipient</th>
                  <th className="px-3 py-2 font-medium">Original</th>
                  <th className="px-3 py-2 font-medium">Outstanding</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {advances.map((advance) => (
                  <tr key={advance.id} className="border-b last:border-0">
                    <td className="px-3 py-2">
                      <Link
                        href={`/p/${slug}/advances/${advance.id}`}
                        className="hover:underline"
                      >
                        {formatDate(advance.issuedAt)}
                      </Link>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {advance.advanceNumber}
                    </td>
                    <td className="px-3 py-2">
                      {advance.recipientName ?? "—"}
                    </td>
                    <td className="px-3 py-2">
                      {formatInrFromPaise(advance.originalAmount)}
                    </td>
                    <td className="px-3 py-2 font-medium">
                      {formatInrFromPaise(advance.outstanding)}
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant="outline">{advance.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 md:hidden">
            {advances.map((advance) => (
              <Link
                key={advance.id}
                href={`/p/${slug}/advances/${advance.id}`}
                className="border-border block rounded-lg border p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">
                      {formatInrFromPaise(advance.outstanding)} outstanding
                    </p>
                    <p className="text-muted-foreground text-sm">
                      {advance.recipientName ?? "Advance"} ·{" "}
                      {formatDate(advance.issuedAt)}
                    </p>
                  </div>
                  <Badge variant="outline">{advance.status}</Badge>
                </div>
                <p className="text-muted-foreground mt-1 font-mono text-xs">
                  {advance.advanceNumber}
                </p>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
