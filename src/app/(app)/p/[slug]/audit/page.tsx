import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AppError } from "@/lib/errors";
import { listProjectAuditLog } from "@/server/audit/service";

export const metadata: Metadata = {
  title: "Audit log",
};

function formatWhen(date: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default async function AuditPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let entries: Awaited<ReturnType<typeof listProjectAuditLog>>["entries"];
  try {
    ({ entries } = await listProjectAuditLog(slug));
  } catch (error) {
    if (error instanceof AppError && error.code === "FORBIDDEN") {
      notFound();
    }
    throw error;
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      <div className="space-y-1">
        <h2 className="font-heading text-2xl tracking-tight">Audit log</h2>
        <p className="text-muted-foreground text-sm">
          Sensitive actions with actor, entity, and safe metadata. Secrets are
          never stored here.
        </p>
      </div>

      {entries.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No audit entries</CardTitle>
            <CardDescription>
              Mutations will append CREATE / APPROVE / PAYMENT / DOWNLOAD and
              related events.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="border-border overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="bg-muted/40 text-muted-foreground text-xs tracking-wide uppercase">
              <tr>
                <th className="px-3 py-2 font-medium">When</th>
                <th className="px-3 py-2 font-medium">Actor</th>
                <th className="px-3 py-2 font-medium">Action</th>
                <th className="px-3 py-2 font-medium">Entity</th>
                <th className="px-3 py-2 font-medium">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {entries.map((entry) => (
                <tr key={entry.id}>
                  <td className="text-muted-foreground px-3 py-2 whitespace-nowrap">
                    {formatWhen(entry.createdAt)}
                  </td>
                  <td className="px-3 py-2">
                    {entry.actor.name ?? entry.actor.email ?? entry.actorId}
                  </td>
                  <td className="px-3 py-2 font-medium">{entry.action}</td>
                  <td className="px-3 py-2">
                    <span className="text-muted-foreground">
                      {entry.entityType}
                    </span>
                    <span className="text-muted-foreground/80 ml-1 font-mono text-xs">
                      {entry.entityId.slice(-8)}
                    </span>
                  </td>
                  <td className="text-muted-foreground max-w-[18rem] truncate px-3 py-2 font-mono text-xs">
                    {entry.metadata ? JSON.stringify(entry.metadata) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
