import type { Metadata } from "next";
import Link from "next/link";

import { UpdateMilestoneForm } from "@/components/tasks/task-forms";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDate, formatDateTime } from "@/lib/dates";
import { roleHasPermission } from "@/server/authorization";
import { getMilestone } from "@/server/tasks/service";

export const metadata: Metadata = {
  title: "Milestone",
};

export default async function MilestoneDetailPage({
  params,
}: {
  params: Promise<{ slug: string; milestoneId: string }>;
}) {
  const { slug, milestoneId } = await params;
  const { role, milestone } = await getMilestone(slug, milestoneId);
  const canEdit = roleHasPermission(role, "TASK_EDIT");

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8 sm:px-6">
      <div className="space-y-1">
        <p className="text-muted-foreground font-mono text-xs">
          {milestone.milestoneNumber}
        </p>
        <h2 className="font-heading text-3xl tracking-tight">
          {milestone.title}
        </h2>
        <div className="flex flex-wrap gap-2">
          <Badge>{milestone.status}</Badge>
          <Badge variant="outline">{milestone.visibility}</Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
          <CardDescription>
            {milestone.description || "No description"}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-muted-foreground space-y-2 text-sm">
          <p>
            Target:{" "}
            {milestone.targetDate ? formatDate(milestone.targetDate) : "—"}
          </p>
          <p>
            Created by: {milestone.createdBy.name ?? milestone.createdBy.email}{" "}
            · {formatDateTime(milestone.createdAt)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Linked tasks</CardTitle>
          <CardDescription>
            {milestone.tasks.length} task
            {milestone.tasks.length === 1 ? "" : "s"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {milestone.tasks.length === 0 ? (
            <p className="text-muted-foreground text-sm">No tasks linked yet.</p>
          ) : (
            milestone.tasks.map((task) => (
              <Link
                key={task.id}
                href={`/p/${slug}/tasks/${task.id}`}
                className="border-border flex items-center justify-between gap-2 rounded-lg border p-3 text-sm"
              >
                <span>{task.title}</span>
                <Badge variant="outline">{task.status}</Badge>
              </Link>
            ))
          )}
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
            <UpdateMilestoneForm
              slug={slug}
              milestoneId={milestoneId}
              defaults={{
                title: milestone.title,
                description: milestone.description ?? "",
                status: milestone.status,
                targetDate: milestone.targetDate
                  ? milestone.targetDate.toISOString().slice(0, 10)
                  : "",
              }}
            />
          </CardContent>
        </Card>
      ) : null}

      <Link
        href={`/p/${slug}/milestones`}
        className="text-muted-foreground text-sm underline-offset-4 hover:underline"
      >
        Back to milestones
      </Link>
    </div>
  );
}
