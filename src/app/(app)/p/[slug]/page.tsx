import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  AlertTriangle,
  Banknote,
  CheckSquare,
  FileUp,
  Flag,
  FolderOpen,
  HandCoins,
  PiggyBank,
  Plus,
  Receipt,
  Wallet,
} from "lucide-react";

import {
  AnimatedPercent,
} from "@/components/dashboard/animated-money";
import { MetricCard } from "@/components/dashboard/metric-card";
import { MonthlySpendChart } from "@/components/dashboard/monthly-chart";
import { ProgressBar } from "@/components/dashboard/progress-bar";
import { SpendDonut } from "@/components/dashboard/spend-charts";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { formatDate, formatDateTime } from "@/lib/dates";
import { formatInrFromPaise } from "@/lib/money";
import { cn } from "@/lib/utils";
import { getProjectDashboard } from "@/server/dashboard/service";

export const metadata: Metadata = {
  title: "Dashboard",
};

function greetingForNow(now = new Date()) {
  const hour = Number(
    new Intl.DateTimeFormat("en-IN", {
      hour: "numeric",
      hour12: false,
      timeZone: "Asia/Kolkata",
    }).format(now),
  );
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function statusTone(status: string) {
  switch (status) {
    case "PAID":
    case "COMPLETED":
    case "APPROVED":
      return "border-cta/30 bg-cta/15 text-mint";
    case "PENDING":
    case "CHANGES_REQUESTED":
    case "IN_PROGRESS":
      return "border-warning/30 bg-warning/15 text-warning";
    case "REJECTED":
    case "OVERDUE":
    case "CANCELLED":
      return "border-destructive/30 bg-destructive/15 text-destructive";
    case "UPCOMING":
      return "border-white/15 bg-white/[0.06] text-muted-white";
    default:
      return "border-white/15 bg-white/[0.06] text-muted-white";
  }
}

export default async function ProjectDashboardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getProjectDashboard(slug);
  const { summary, project, role, milestoneProgress } = data;

  const trackLabel =
    milestoneProgress.percent >= 100
      ? "Complete"
      : milestoneProgress.percent >= 40
        ? "On track"
        : milestoneProgress.total === 0
          ? "Planning"
          : "In progress";

  const nextMilestone = data.upcomingMilestones[0] ?? null;
  const attentionEmpty =
    data.pendingRequests.length === 0 &&
    data.approvedToPay.length === 0 &&
    data.overdueTasks.length === 0 &&
    data.expiringDocuments.length === 0;

  const quickActions = [
    data.permissions.canCreateFinance
      ? {
          href: `/p/${slug}/finance/new`,
          label: "Add expense",
          icon: Plus,
          tone: "bg-emerald-bright/15 text-emerald-bright",
        }
      : null,
    {
      href: `/p/${slug}/payment-requests/new`,
      label: "Payment request",
      icon: Receipt,
      tone: "bg-cyan/15 text-cyan",
    },
    {
      href: `/p/${slug}/documents/new`,
      label: "Upload document",
      icon: FileUp,
      tone: "bg-purple/15 text-purple",
    },
    {
      href: `/p/${slug}/tasks/new`,
      label: "Add task",
      icon: CheckSquare,
      tone: "bg-blue/15 text-blue",
    },
    {
      href: `/p/${slug}/advances/new`,
      label: "Record advance",
      icon: HandCoins,
      tone: "bg-pink/15 text-pink",
    },
    {
      href: `/p/${slug}/reports`,
      label: "View reports",
      icon: Wallet,
      tone: "bg-warning/15 text-warning",
    },
  ].filter(Boolean) as Array<{
    href: string;
    label: string;
    icon: typeof Plus;
    tone: string;
  }>;

  const spentOfBudgetBps =
    summary.planned > 0
      ? Math.round((summary.spent * 10_000) / summary.planned)
      : 0;

  const sparkFromMonthly = (key: "spent" | "committed") =>
    data.monthlySpend.map((m) => m[key]);

  return (
    <div className="animate-page-in space-y-6">
      {/* Hero with home imagery */}
      <section className="relative min-h-[17rem] overflow-hidden rounded-[1.375rem] border border-white/[0.09] sm:min-h-[18.5rem]">
        <Image
          src="/brand/home-hero.jpg"
          alt="Architectural render of a modern home"
          width={1600}
          height={720}
          priority
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(3,38,36,0.92)_0%,rgba(3,38,36,0.72)_45%,rgba(3,38,36,0.25)_100%)]" />
        <div className="absolute inset-0 bg-gradient-to-t from-[rgba(3,38,36,0.55)] via-transparent to-transparent" />
        <div className="relative flex h-full min-h-[17rem] flex-col justify-between gap-6 p-5 sm:min-h-[18.5rem] sm:p-7 lg:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl space-y-3">
              <p className="text-meta text-mint/80">
                {greetingForNow()}
                {role ? ` · ${role}` : ""}
              </p>
              <h2 className="font-heading text-[2.25rem] leading-[1.08] tracking-[-0.03em] text-white sm:text-[2.75rem] lg:text-[3.125rem]">
                Let&apos;s build something{" "}
                <span className="text-cta">amazing</span>.
              </h2>
              <p className="max-w-xl text-sm text-muted-white sm:text-base">
                Here&apos;s what&apos;s happening with {project.name} today —
                shared figures only.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {data.permissions.canCreateFinance ? (
                <Link
                  href={`/p/${slug}/finance/new`}
                  className={cn(buttonVariants(), "glow-cta")}
                >
                  Add expense
                </Link>
              ) : null}
              <Link
                href={`/p/${slug}/budget`}
                className={cn(buttonVariants({ variant: "outline" }))}
              >
                View budget
              </Link>
            </div>
          </div>

          <div className="ml-auto w-full max-w-sm rounded-2xl border border-white/[0.08] bg-black/20 p-4 backdrop-blur-md sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-meta text-mint/80">Project progress</p>
              <Badge className={statusTone("IN_PROGRESS")}>{trackLabel}</Badge>
            </div>
            <div className="mt-2 flex flex-wrap items-end gap-3">
              <p className="font-heading text-4xl text-white sm:text-5xl">
                <AnimatedPercent value={milestoneProgress.percent} />
              </p>
              <p className="pb-1 text-sm text-muted-white">
                {milestoneProgress.completed}/{milestoneProgress.total}{" "}
                milestones
                {nextMilestone?.targetDate
                  ? ` · Next ${formatDate(nextMilestone.targetDate)}`
                  : ""}
              </p>
            </div>
            <ProgressBar
              value={milestoneProgress.percent}
              glow
              className="mt-3"
            />
          </div>
        </div>
      </section>

      {/* Metrics */}
      <section className="stagger-in grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total project budget"
          paise={summary.planned}
          hint="Planned / estimated"
          accent="cyan"
          icon={<PiggyBank className="size-4" />}
          spark={sparkFromMonthly("committed")}
        />
        <MetricCard
          label="Total spent (shared)"
          paise={summary.spent}
          hint={
            summary.planned > 0
              ? `${(spentOfBudgetBps / 100).toFixed(1)}% of budget`
              : "Shared expenses + advances"
          }
          accent="green"
          icon={<Banknote className="size-4" />}
          spark={sparkFromMonthly("spent")}
        />
        <MetricCard
          label="Outstanding advances"
          paise={summary.outstandingAdvances}
          hint={`${data.advanceRows.length} open advance${data.advanceRows.length === 1 ? "" : "s"}`}
          accent="purple"
          icon={<HandCoins className="size-4" />}
          spark={sparkFromMonthly("spent")}
        />
        <MetricCard
          label="Open commitments"
          paise={summary.committed}
          hint={`${summary.pendingRequestCount} pending · ${summary.approvedToPayCount} to pay`}
          accent="amber"
          icon={<Receipt className="size-4" />}
          spark={sparkFromMonthly("committed")}
        />
      </section>

      {/* Charts + milestones — ~50 / 25 / 25 */}
      <section className="grid gap-4 xl:grid-cols-12 xl:gap-5">
        <div className="surface-card space-y-4 rounded-[1.125rem] p-5 xl:col-span-6">
          <div>
            <h3 className="text-section">Spending overview</h3>
            <p className="mt-1 text-sm text-muted-white">
              Monthly spent vs committed · Asia/Kolkata
            </p>
          </div>
          <MonthlySpendChart
            series={data.monthlySpend}
            year={data.monthlySpendYear}
          />
        </div>

        <div className="surface-card space-y-4 rounded-[1.125rem] p-5 xl:col-span-3">
          <div className="flex items-end justify-between gap-2">
            <div>
              <h3 className="text-section">Expense by category</h3>
              <p className="mt-1 text-sm text-muted-white">
                Shared spend mix
              </p>
            </div>
            <Link
              href={`/p/${slug}/finance`}
              className="text-sm text-mint hover:text-mint-light"
            >
              Ledger
            </Link>
          </div>
          <SpendDonut slices={data.topSpend} totalPaise={summary.spent} />
        </div>

        <div className="surface-card space-y-4 rounded-[1.125rem] p-5 xl:col-span-3">
          <div className="flex items-end justify-between gap-2">
            <div>
              <h3 className="text-section">Upcoming milestones</h3>
              <p className="mt-1 text-sm text-muted-white">Build roadmap</p>
            </div>
            <Link
              href={`/p/${slug}/milestones`}
              className="text-sm text-mint hover:text-mint-light"
            >
              View all →
            </Link>
          </div>
          {milestoneProgress.timeline.length === 0 ? (
            <p className="text-sm text-muted-white">No milestones yet.</p>
          ) : (
            <ol className="relative ml-3 space-y-0 border-l border-white/15">
              {milestoneProgress.timeline.map((ms) => {
                const done = ms.status === "COMPLETED";
                const current = ms.status === "IN_PROGRESS";
                return (
                  <li key={ms.id} className="relative pb-4 pl-5 last:pb-0">
                    <span
                      aria-hidden
                      className={cn(
                        "absolute top-1 -left-[5px] size-2.5 rounded-full",
                        done &&
                          "bg-cta shadow-[0_0_10px_rgba(0,208,132,0.5)]",
                        current &&
                          "bg-cyan shadow-[0_0_10px_rgba(34,211,238,0.45)]",
                        !done && !current && "bg-white/25",
                      )}
                    />
                    <Link href={`/p/${slug}/milestones/${ms.id}`} className="block">
                      <p className="text-sm font-medium text-white">{ms.title}</p>
                      <Badge className={cn("mt-1", statusTone(ms.status))}>
                        {ms.status.replaceAll("_", " ")}
                      </Badge>
                    </Link>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </section>

      {/* Transactions · Attention · Quick actions */}
      <section className="grid gap-4 lg:grid-cols-12 lg:gap-5">
        <div className="surface-card space-y-4 rounded-[1.125rem] p-5 lg:col-span-5">
          <div className="flex items-end justify-between gap-2">
            <div>
              <h3 className="text-section">Recent transactions</h3>
              <p className="mt-1 text-sm text-muted-white">
                Latest shared ledger activity
              </p>
            </div>
            <Link
              href={`/p/${slug}/finance`}
              className="text-sm text-mint hover:text-mint-light"
            >
              All
            </Link>
          </div>
          {data.recentTransactions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/15 px-4 py-8 text-center">
              <p className="text-sm text-muted-white">
                No project expenses yet.
              </p>
              {data.permissions.canCreateFinance ? (
                <Link
                  href={`/p/${slug}/finance/new`}
                  className={cn(buttonVariants({ size: "sm" }), "mt-3")}
                >
                  Add expense
                </Link>
              ) : null}
            </div>
          ) : (
            <ul className="divide-y divide-white/[0.06]">
              {data.recentTransactions.map((tx) => (
                <li key={tx.id}>
                  <Link
                    href={`/p/${slug}/finance/${tx.id}`}
                    className="flex items-center gap-3 px-1 py-3 transition-ki-fast hover:bg-white/[0.035]"
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-bright/15 text-emerald-bright">
                      <Banknote className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-white">
                        {tx.title}
                      </span>
                      <span className="block text-xs text-muted-white">
                        {tx.categoryName} · {formatDate(tx.at)}
                      </span>
                    </span>
                    <span className="text-right">
                      <span className="block font-tabular text-sm text-white">
                        {formatInrFromPaise(tx.amount)}
                      </span>
                      <Badge className={cn("mt-1", statusTone(tx.status))}>
                        {tx.status}
                      </Badge>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="surface-card space-y-4 rounded-[1.125rem] p-5 lg:col-span-4">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-warning/15 text-warning">
              <AlertTriangle className="size-4" />
            </span>
            <div>
              <h3 className="text-section">Needs attention</h3>
              <p className="text-sm text-muted-white">
                Requests, overdue work, expiries
              </p>
            </div>
          </div>

          <div className="space-y-2.5">
            {attentionEmpty ? (
              <p className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-6 text-sm text-muted-white">
                Nothing urgent right now — you&apos;re clear for today.
              </p>
            ) : null}

            {data.pendingRequests.map((req) => (
              <Link
                key={req.id}
                href={`/p/${slug}/payment-requests/${req.id}`}
                className="block rounded-xl border border-white/10 bg-white/[0.03] p-3 transition-ki-fast hover:border-warning/40 hover:bg-white/[0.05]"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-white">{req.title}</p>
                    <p className="text-sm text-muted-white">
                      {formatInrFromPaise(req.amount)}
                    </p>
                  </div>
                  <Badge className={statusTone("PENDING")}>Pending</Badge>
                </div>
              </Link>
            ))}

            {data.approvedToPay.map((req) => (
              <Link
                key={req.id}
                href={`/p/${slug}/payment-requests/${req.id}`}
                className="block rounded-xl border border-white/10 bg-white/[0.03] p-3 transition-ki-fast hover:border-cta/40 hover:bg-white/[0.05]"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-white">{req.title}</p>
                    <p className="text-sm text-muted-white">
                      Ready to pay · {formatInrFromPaise(req.amount)}
                    </p>
                  </div>
                  <Badge className={statusTone("APPROVED")}>Approved</Badge>
                </div>
              </Link>
            ))}

            {data.overdueTasks.map((task) => (
              <Link
                key={task.id}
                href={`/p/${slug}/tasks/${task.id}`}
                className="block rounded-xl border border-white/10 bg-white/[0.03] p-3 transition-ki-fast hover:border-destructive/40 hover:bg-white/[0.05]"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-white">{task.title}</p>
                    <p className="text-sm text-muted-white">
                      Overdue
                      {task.dueDate ? ` · ${formatDate(task.dueDate)}` : ""}
                    </p>
                  </div>
                  <Badge className={statusTone("OVERDUE")}>Task</Badge>
                </div>
              </Link>
            ))}

            {data.expiringDocuments.map((doc) => (
              <Link
                key={doc.id}
                href={`/p/${slug}/documents/${doc.id}`}
                className="block rounded-xl border border-white/10 bg-white/[0.03] p-3 transition-ki-fast hover:border-warning/40 hover:bg-white/[0.05]"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-white">{doc.title}</p>
                    <p className="text-sm text-muted-white">
                      Expires{" "}
                      {doc.expiryDate ? formatDate(doc.expiryDate) : "soon"}
                    </p>
                  </div>
                  <Badge className={statusTone("PENDING")}>Expiring</Badge>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="surface-card space-y-4 rounded-[1.125rem] p-5 lg:col-span-3">
          <div>
            <h3 className="text-section">Quick actions</h3>
            <p className="mt-1 text-sm text-muted-white">
              Jump into the next task
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.href}
                  href={action.href}
                  className="group flex flex-col items-start gap-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 transition-ki hover:-translate-y-0.5 hover:border-white/15 hover:bg-white/[0.05]"
                >
                  <span
                    className={cn(
                      "flex size-9 items-center justify-center rounded-lg transition-ki group-hover:scale-105",
                      action.tone,
                    )}
                  >
                    <Icon className="size-4" />
                  </span>
                  <span className="text-xs font-medium leading-snug text-white">
                    {action.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Advances + Documents */}
      <section className="grid gap-4 lg:grid-cols-2 lg:gap-5">
        <div className="surface-card space-y-4 rounded-[1.125rem] p-5">
          <div className="flex items-end justify-between gap-2">
            <div>
              <h3 className="text-section">Outstanding advances</h3>
              <p className="mt-1 text-sm text-muted-white">
                Server-computed remaining balances
              </p>
            </div>
            <Link
              href={`/p/${slug}/advances`}
              className="text-sm text-mint hover:text-mint-light"
            >
              All
            </Link>
          </div>
          {data.advanceRows.length === 0 ? (
            <p className="text-sm text-muted-white">No open advances.</p>
          ) : (
            <div className="space-y-3">
              {data.advanceRows.map((advance) => {
                const utilized =
                  advance.originalAmount > 0
                    ? Math.min(
                        100,
                        Math.round(
                          ((advance.originalAmount - advance.outstanding) *
                            100) /
                            advance.originalAmount,
                        ),
                      )
                    : 0;
                return (
                  <Link
                    key={advance.id}
                    href={`/p/${slug}/advances/${advance.id}`}
                    className="block rounded-xl border border-white/10 bg-white/[0.03] p-4 transition-ki-fast hover:bg-white/[0.05]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-meta text-purple">Advance</p>
                        <p className="font-medium text-white">
                          {advance.recipientName ?? advance.advanceNumber}
                        </p>
                        <p className="font-mono text-xs text-muted-white">
                          {advance.advanceNumber}
                        </p>
                      </div>
                      <p className="text-right">
                        <span className="block font-tabular text-sm text-white">
                          {formatInrFromPaise(advance.outstanding)}
                        </span>
                        <span className="text-xs text-muted-white">
                          remaining
                        </span>
                      </p>
                    </div>
                    <div className="mt-3 space-y-1.5">
                      <div className="flex justify-between text-xs text-muted-white">
                        <span>{utilized}% utilized</span>
                        <span>
                          of {formatInrFromPaise(advance.originalAmount)}
                        </span>
                      </div>
                      <ProgressBar value={utilized} />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <div className="surface-card space-y-4 rounded-[1.125rem] p-5">
          <div className="flex items-end justify-between gap-2">
            <div>
              <h3 className="text-section">Documents</h3>
              <p className="mt-1 text-sm text-muted-white">
                Recent project files
              </p>
            </div>
            <Link
              href={`/p/${slug}/documents`}
              className="text-sm text-mint hover:text-mint-light"
            >
              Library
            </Link>
          </div>
          {data.recentDocuments.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/15 px-4 py-8 text-center">
              <p className="text-sm text-muted-white">
                No documents uploaded yet.
              </p>
              <Link
                href={`/p/${slug}/documents/new`}
                className={cn(buttonVariants({ size: "sm" }), "mt-3")}
              >
                Upload document
              </Link>
            </div>
          ) : (
            <ul className="space-y-2">
              {data.recentDocuments.map((doc) => (
                <li key={doc.id}>
                  <Link
                    href={`/p/${slug}/documents/${doc.id}`}
                    className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 transition-ki-fast hover:bg-white/[0.05]"
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-cyan/15 text-cyan">
                      <FolderOpen className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-white">
                        {doc.title}
                      </span>
                      <span className="block text-xs text-muted-white">
                        {doc.category.replaceAll("_", " ")} ·{" "}
                        {formatDate(doc.at)}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Activity */}
      <section className="surface-card space-y-4 rounded-[1.125rem] p-5">
        <div>
          <h3 className="text-section">Recent activity</h3>
          <p className="mt-1 text-sm text-muted-white">
            Latest authorized project events
          </p>
        </div>
        {data.activity.length === 0 ? (
          <p className="text-sm text-muted-white">No activity yet.</p>
        ) : (
          <ul className="divide-y divide-white/10">
            {data.activity.map((item) => (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className="flex flex-wrap items-start justify-between gap-2 py-3 transition-ki-fast hover:bg-white/[0.02]"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-mint">
                      <Flag className="size-3.5" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-white">
                        {item.title}
                      </p>
                      <p className="text-sm text-muted-white">
                        {item.kind.replaceAll("_", " ")} · {item.subtitle}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs font-tabular text-muted-white">
                    {formatDateTime(item.at)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Promo with home image */}
      <section className="relative overflow-hidden rounded-[1.375rem] border border-white/[0.09]">
        <Image
          src="/brand/home-dusk.jpg"
          alt="Modern villa at dusk"
          width={1200}
          height={480}
          className="h-40 w-full object-cover sm:h-48"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[rgba(3,38,36,0.92)] via-[rgba(3,38,36,0.7)] to-transparent" />
        <div className="absolute inset-0 flex items-center p-5 sm:p-6">
          <div className="max-w-lg">
            <p className="text-meta text-mint/80">Kavin Illam</p>
            <p className="font-heading mt-2 text-2xl text-white">
              Track. Manage. Build. Together.
            </p>
            <p className="mt-2 text-sm text-muted-white">
              Every rupee. Every document. Every milestone.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
