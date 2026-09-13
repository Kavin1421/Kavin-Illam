import type { Metadata } from "next";
import Link from "next/link";

import { CreateMilestoneForm } from "@/components/tasks/task-forms";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "New milestone",
};

export default async function NewMilestonePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8 sm:px-6">
      <div className="space-y-1">
        <h2 className="font-heading text-2xl tracking-tight">New milestone</h2>
        <p className="text-muted-foreground text-sm">
          Custom checkpoints — foundation, roof, handover, or anything else.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Milestone details</CardTitle>
          <CardDescription>Starts as UPCOMING.</CardDescription>
        </CardHeader>
        <CardContent>
          <CreateMilestoneForm slug={slug} />
        </CardContent>
      </Card>

      <Link
        href={`/p/${slug}/milestones`}
        className="text-muted-foreground text-sm underline-offset-4 hover:underline"
      >
        Back to milestones
      </Link>
    </div>
  );
}
