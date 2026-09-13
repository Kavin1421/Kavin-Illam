import type { Metadata } from "next";
import Link from "next/link";

import { CreateTaskForm } from "@/components/tasks/task-forms";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { listProjectMembers } from "@/server/projects/members";
import { listMilestones } from "@/server/tasks/service";

export const metadata: Metadata = {
  title: "New task",
};

export default async function NewTaskPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [{ members }, { milestones }] = await Promise.all([
    listProjectMembers(slug),
    listMilestones(slug),
  ]);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8 sm:px-6">
      <div className="space-y-1">
        <h2 className="font-heading text-2xl tracking-tight">New task</h2>
        <p className="text-muted-foreground text-sm">
          Assign to a project member and optionally link a milestone.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Task details</CardTitle>
          <CardDescription>Starts in TODO status.</CardDescription>
        </CardHeader>
        <CardContent>
          <CreateTaskForm
            slug={slug}
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
          />
        </CardContent>
      </Card>

      <Link
        href={`/p/${slug}/tasks`}
        className="text-muted-foreground text-sm underline-offset-4 hover:underline"
      >
        Back to tasks
      </Link>
    </div>
  );
}
