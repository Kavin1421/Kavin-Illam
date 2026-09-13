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
import { formatDate, formatDateTime } from "@/lib/dates";
import { formatInrFromPaise } from "@/lib/money";
import { cn } from "@/lib/utils";
import { getProjectDashboard } from "@/server/dashboard/service";

export const metadata: Metadata = {
  title: "Dashboard",
};

function Metric({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="space-y-1">
      <p className="text-muted-foreground text-xs tracking-wide uppercase">
        {label}
      </p>
      <p className="font-heading text-2xl tracking-tight">{value}</p>
      {hint ? <p className="text-muted-foreground text-xs">{hint}</p> : null}
    </div>
  );
}

export default async function ProjectDashboardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getProjectDashboard(slug);
  const { summary, project, role } = data;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{role}</Badge>
            <Badge variant="outline">{project.status}</Badge>
            <Badge variant="outline">
              {project.projectType.replaceAll("_", " ")}
            </Badge>
          </div>
          <h2 className="font-heading text-3xl tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground max-w-2xl text-sm">
            Shared project figures only — private expenses never appear in these
            totals. Remaining is shown vs paid and vs committed separately.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {data.permissions.canCreateFinance ? (
            <Link
              href={`/p/${slug}/finance/new`}
              className={cn(buttonVariants({ size: "sm" }))}
            >
              Add expense
            </Link>
          ) : null}
          <Link
            href={`/p/${slug}/payment-requests`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Requests
          </Link>
          <Link
            href={`/p/${slug}/budget`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Budget
          </Link>
        </div>
      </div>

      <section className="grid gap-6 border-b pb-8 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          label="Spent (shared)"
          value={formatInrFromPaise(summary.spent)}
          hint="Expenses + advances"
        />
        <Metric
          label="Budget remaining vs paid"
          value={formatInrFromPaise(summary.remainingVsPaid)}
          hint={`Planned ${formatInrFromPaise(summary.planned)}`}
        />
        <Metric
          label="Outstanding advances"
          value={formatInrFromPaise(summary.outstandingAdvances)}
        />
        <Metric
          label="Open commitments"
          value={formatInrFromPaise(summary.committed)}
          hint={`${summary.pendingRequestCount} pending · ${summary.approvedToPayCount} to pay`}
        />
      </section>

      <section className="grid gap-8 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-3">
          <div className="flex items-end justify-between gap-2">
            <div>
              <h3 className="font-heading text-xl tracking-tight">
                Where money went
              </h3>
              <p className="text-muted-foreground text-sm">
                Top shared spend by category
              </p>
            </div>
            <Link
              href={`/p/${slug}/finance`}
              className="text-muted-foreground text-sm underline-offset-4 hover:underline"
            >
              Ledger
            </Link>
          </div>

          {data.topSpend.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No shared spend recorded yet.
            </p>
          ) : (
            <div className="space-y-4">
              {data.topSpend.map((row) => (
                <div key={row.categoryId ?? row.categoryName} className="space-y-1.5">
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="font-medium">{row.categoryName}</span>
                    <span className="tabular-nums">
                      {formatInrFromPaise(row.amount)}
                    </span>
                  </div>
                  <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
                    <div
                      className="bg-foreground/80 h-full rounded-full"
                      style={{ width: `${Math.max(row.shareBps / 100, 4)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="grid gap-4 pt-4 sm:grid-cols-3">
            <div className="border-border space-y-1 border-t pt-4">
              <p className="text-muted-foreground text-xs uppercase">Paid</p>
              <p className="text-lg font-medium tabular-nums">
                {formatInrFromPaise(summary.paid)}
              </p>
            </div>
            <div className="border-border space-y-1 border-t pt-4">
              <p className="text-muted-foreground text-xs uppercase">
                Remaining vs committed
              </p>
              <p className="text-lg font-medium tabular-nums">
                {formatInrFromPaise(summary.remainingVsCommitted)}
              </p>
            </div>
            <div className="border-border space-y-1 border-t pt-4">
              <p className="text-muted-foreground text-xs uppercase">Net cash</p>
              <p className="text-lg font-medium tabular-nums">
                {formatInrFromPaise(summary.netCashFlow)}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4 lg:col-span-2">
          <div>
            <h3 className="font-heading text-xl tracking-tight">Needs attention</h3>
            <p className="text-muted-foreground text-sm">
              Engineer requests, overdue work, expiries
            </p>
          </div>

          <div className="space-y-3">
            {data.pendingRequests.length === 0 &&
            data.approvedToPay.length === 0 &&
            data.overdueTasks.length === 0 &&
            data.expiringDocuments.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Nothing urgent right now.
              </p>
            ) : null}

            {data.pendingRequests.map((req) => (
              <Link
                key={req.id}
                href={`/p/${slug}/payment-requests/${req.id}`}
                className="border-border block rounded-lg border p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{req.title}</p>
                    <p className="text-muted-foreground text-sm">
                      Pending · {formatInrFromPaise(req.amount)}
                    </p>
                  </div>
                  <Badge variant="outline">REQUEST</Badge>
                </div>
              </Link>
            ))}

            {data.approvedToPay.map((req) => (
              <Link
                key={req.id}
                href={`/p/${slug}/payment-requests/${req.id}`}
                className="border-border block rounded-lg border p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{req.title}</p>
                    <p className="text-muted-foreground text-sm">
                      Ready to pay · {formatInrFromPaise(req.amount)}
                    </p>
                  </div>
                  <Badge>APPROVED</Badge>
                </div>
              </Link>
            ))}

            {data.overdueTasks.map((task) => (
              <Link
                key={task.id}
                href={`/p/${slug}/tasks/${task.id}`}
                className="border-border block rounded-lg border p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{task.title}</p>
                    <p className="text-muted-foreground text-sm">
                      Overdue
                      {task.dueDate ? ` · ${formatDate(task.dueDate)}` : ""}
                    </p>
                  </div>
                  <Badge variant="destructive">TASK</Badge>
                </div>
              </Link>
            ))}

            {data.expiringDocuments.map((doc) => (
              <Link
                key={doc.id}
                href={`/p/${slug}/documents/${doc.id}`}
                className="border-border block rounded-lg border p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{doc.title}</p>
                    <p className="text-muted-foreground text-sm">
                      Expires{" "}
                      {doc.expiryDate ? formatDate(doc.expiryDate) : "soon"}
                    </p>
                  </div>
                  <Badge variant="outline">DOC</Badge>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-8 border-t pt-8 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="flex items-end justify-between gap-2">
            <div>
              <h3 className="font-heading text-xl tracking-tight">
                Outstanding advances
              </h3>
              <p className="text-muted-foreground text-sm">
                Server-computed balances
              </p>
            </div>
            <Link
              href={`/p/${slug}/advances`}
              className="text-muted-foreground text-sm underline-offset-4 hover:underline"
            >
              All
            </Link>
          </div>
          {data.advanceRows.length === 0 ? (
            <p className="text-muted-foreground text-sm">No open advances.</p>
          ) : (
            <div className="space-y-2">
              {data.advanceRows.map((advance) => (
                <Link
                  key={advance.id}
                  href={`/p/${slug}/advances/${advance.id}`}
                  className="border-border flex items-center justify-between gap-3 rounded-lg border p-3"
                >
                  <div>
                    <p className="font-medium">
                      {advance.recipientName ?? advance.advanceNumber}
                    </p>
                    <p className="text-muted-foreground font-mono text-xs">
                      {advance.advanceNumber}
                    </p>
                  </div>
                  <p className="font-medium tabular-nums">
                    {formatInrFromPaise(advance.outstanding)}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex items-end justify-between gap-2">
            <div>
              <h3 className="font-heading text-xl tracking-tight">
                Upcoming milestones
              </h3>
              <p className="text-muted-foreground text-sm">Next checkpoints</p>
            </div>
            <Link
              href={`/p/${slug}/milestones`}
              className="text-muted-foreground text-sm underline-offset-4 hover:underline"
            >
              All
            </Link>
          </div>
          {data.upcomingMilestones.length === 0 ? (
            <p className="text-muted-foreground text-sm">No upcoming milestones.</p>
          ) : (
            <div className="space-y-2">
              {data.upcomingMilestones.map((ms) => (
                <Link
                  key={ms.id}
                  href={`/p/${slug}/milestones/${ms.id}`}
                  className="border-border flex items-center justify-between gap-3 rounded-lg border p-3"
                >
                  <div>
                    <p className="font-medium">{ms.title}</p>
                    <p className="text-muted-foreground text-sm">
                      {ms.targetDate ? formatDate(ms.targetDate) : "No date"}
                    </p>
                  </div>
                  <Badge variant="outline">{ms.status}</Badge>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="space-y-4 border-t pt-8">
        <div className="flex items-end justify-between gap-2">
          <div>
            <h3 className="font-heading text-xl tracking-tight">
              Recent activity
            </h3>
            <p className="text-muted-foreground text-sm">
              Latest authorized project events
            </p>
          </div>
        </div>
        {data.activity.length === 0 ? (
          <p className="text-muted-foreground text-sm">No activity yet.</p>
        ) : (
          <div className="divide-border divide-y rounded-lg border">
            {data.activity.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className="hover:bg-muted/40 flex flex-wrap items-start justify-between gap-2 px-4 py-3"
              >
                <div>
                  <p className="font-medium">{item.title}</p>
                  <p className="text-muted-foreground text-sm">
                    {item.kind.replaceAll("_", " ")} · {item.subtitle}
                  </p>
                </div>
                <p className="text-muted-foreground text-xs tabular-nums">
                  {formatDateTime(item.at)}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>

      {project.address || project.description ? (
        <Card>
          <CardHeader>
            <CardTitle>Project</CardTitle>
            <CardDescription>
              {project.description || "No description yet."}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">
            Address: {project.address || "—"}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
