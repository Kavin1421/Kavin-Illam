import type { Metadata } from "next";
import Link from "next/link";

import { UpdateTaskForm } from "@/components/tasks/task-forms";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDate, formatDateTime } from "@/lib/dates";
import { withNotFound } from "@/lib/with-not-found";
import { roleHasPermission } from "@/server/authorization";
import { listProjectMembers } from "@/server/projects/members";
import { getTask, listMilestones } from "@/server/tasks/service";

export const metadata: Metadata = {
  title: "Task",
};

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ slug: string; taskId: string }>;
}) {
  const { slug, taskId } = await params;
  const [{ role, task }, { members }, { milestones }] = await Promise.all([
    withNotFound(() => getTask(slug, taskId)),
    listProjectMembers(slug),
    listMilestones(slug),
  ]);
  const canEdit = roleHasPermission(role, "TASK_EDIT");

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8 sm:px-6">
      <div className="space-y-1">
        <p className="text-muted-foreground font-mono text-xs">
          {task.taskNumber}
        </p>
        <h2 className="font-heading text-3xl tracking-tight">{task.title}</h2>
        <div className="flex flex-wrap gap-2">
          <Badge>{task.status}</Badge>
          <Badge variant="secondary">{task.priority}</Badge>
          <Badge variant="outline">{task.visibility}</Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
          <CardDescription>
            {task.description || "No description"}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-muted-foreground space-y-2 text-sm">
          <p>
            Assignee:{" "}
            {task.assignee?.name ?? task.assignee?.email ?? "Unassigned"}
          </p>
          <p>
            Milestone:{" "}
            {task.milestone ? (
              <Link
                href={`/p/${slug}/milestones/${task.milestone.id}`}
                className="underline-offset-4 hover:underline"
              >
                {task.milestone.title}
              </Link>
            ) : (
              "—"
            )}
          </p>
          <p>Due: {task.dueDate ? formatDate(task.dueDate) : "—"}</p>
          <p>
            Created by: {task.createdBy.name ?? task.createdBy.email} ·{" "}
            {formatDateTime(task.createdAt)}
          </p>
        </CardContent>
      </Card>

      {canEdit ? (
        <Card>
          <CardHeader>
            <CardTitle>Update</CardTitle>
            <CardDescription>
              Status changes follow allowed transitions only.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <UpdateTaskForm
              slug={slug}
              taskId={taskId}
              members={members
                .filter((m) => m.status === "ACTIVE")
                .map((m) => ({
                  id: m.user.id,
                  name: m.user.name ?? m.user.email ?? "Member",
                }))}
              milestones={milestones.map((m) => ({
                id: m.id,
                title: m.title,
              }))}
              defaults={{
                title: task.title,
                description: task.description ?? "",
                priority: task.priority,
                status: task.status,
                assigneeId: task.assigneeId ?? "",
                milestoneId: task.milestoneId ?? "",
                dueDate: task.dueDate
                  ? task.dueDate.toISOString().slice(0, 10)
                  : "",
              }}
            />
          </CardContent>
        </Card>
      ) : null}

      <Link
        href={`/p/${slug}/tasks`}
        className="text-muted-foreground text-sm underline-offset-4 hover:underline"
      >
        Back to tasks
      </Link>
    </div>
  );
}
