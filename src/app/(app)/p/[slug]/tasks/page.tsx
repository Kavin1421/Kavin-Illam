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
import { cn } from "@/lib/utils";
import { roleHasPermission } from "@/server/authorization";
import { listTasks } from "@/server/tasks/service";

export const metadata: Metadata = {
  title: "Tasks",
};

export default async function TasksPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { role, tasks, totals } = await listTasks(slug);
  const canCreate = roleHasPermission(role, "TASK_CREATE");

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h2 className="font-heading text-2xl tracking-tight">Tasks</h2>
          <p className="text-muted-foreground text-sm">
            Operational work items with status TODO → DONE / CANCELLED.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/p/${slug}/milestones`}
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            Milestones
          </Link>
          {canCreate ? (
            <Link
              href={`/p/${slug}/tasks/new`}
              className={cn(buttonVariants())}
            >
              New task
            </Link>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total</CardDescription>
            <CardTitle className="text-xl">{totals.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Open</CardDescription>
            <CardTitle className="text-xl">{totals.openCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Done</CardDescription>
            <CardTitle className="text-xl">{totals.doneCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {tasks.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No tasks yet</CardTitle>
            <CardDescription>
              Create tasks and optionally link them to milestones.
            </CardDescription>
          </CardHeader>
          {canCreate ? (
            <CardContent>
              <Link
                href={`/p/${slug}/tasks/new`}
                className={cn(buttonVariants())}
              >
                Create first task
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
                  <th className="px-3 py-2 font-medium">Task</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Priority</th>
                  <th className="px-3 py-2 font-medium">Assignee</th>
                  <th className="px-3 py-2 font-medium">Due</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
                  <tr key={task.id} className="border-b last:border-0">
                    <td className="px-3 py-2">
                      <Link
                        href={`/p/${slug}/tasks/${task.id}`}
                        className="hover:underline"
                      >
                        <span className="font-medium">{task.title}</span>
                        <span className="text-muted-foreground ml-2 font-mono text-xs">
                          {task.taskNumber}
                        </span>
                      </Link>
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant="outline">{task.status}</Badge>
                    </td>
                    <td className="px-3 py-2">{task.priority}</td>
                    <td className="px-3 py-2">
                      {task.assignee?.name ?? task.assignee?.email ?? "—"}
                    </td>
                    <td className="px-3 py-2">
                      {task.dueDate ? formatDate(task.dueDate) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 md:hidden">
            {tasks.map((task) => (
              <Link
                key={task.id}
                href={`/p/${slug}/tasks/${task.id}`}
                className="border-border block rounded-lg border p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium">{task.title}</p>
                  <Badge variant="outline">{task.status}</Badge>
                </div>
                <p className="text-muted-foreground mt-1 text-sm">
                  {task.priority}
                  {task.dueDate ? ` · due ${formatDate(task.dueDate)}` : ""}
                </p>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
