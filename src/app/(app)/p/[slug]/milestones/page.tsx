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
import { listMilestones } from "@/server/tasks/service";

export const metadata: Metadata = {
  title: "Milestones",
};

export default async function MilestonesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { role, milestones } = await listMilestones(slug);
  const canCreate = roleHasPermission(role, "TASK_CREATE");

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h2 className="font-heading text-2xl tracking-tight">Milestones</h2>
          <p className="text-muted-foreground text-sm">
            Custom project checkpoints. Link tasks under each milestone.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/p/${slug}/tasks`}
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            Tasks
          </Link>
          {canCreate ? (
            <Link
              href={`/p/${slug}/milestones/new`}
              className={cn(buttonVariants())}
            >
              New milestone
            </Link>
          ) : null}
        </div>
      </div>

      {milestones.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No milestones yet</CardTitle>
            <CardDescription>
              Add foundation, structure, finishing — whatever fits the build.
            </CardDescription>
          </CardHeader>
          {canCreate ? (
            <CardContent>
              <Link
                href={`/p/${slug}/milestones/new`}
                className={cn(buttonVariants())}
              >
                Create first milestone
              </Link>
            </CardContent>
          ) : null}
        </Card>
      ) : (
        <div className="space-y-3">
          {milestones.map((milestone) => (
            <Link
              key={milestone.id}
              href={`/p/${slug}/milestones/${milestone.id}`}
              className="border-border block rounded-lg border p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{milestone.title}</p>
                  <p className="text-muted-foreground font-mono text-xs">
                    {milestone.milestoneNumber}
                  </p>
                  <p className="text-muted-foreground mt-1 text-sm">
                    {milestone._count.tasks} task
                    {milestone._count.tasks === 1 ? "" : "s"}
                    {milestone.targetDate
                      ? ` · target ${formatDate(milestone.targetDate)}`
                      : ""}
                  </p>
                </div>
                <Badge variant="outline">{milestone.status}</Badge>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
