import type { Metadata } from "next";
import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { listProjectActivity } from "@/server/audit/service";

export const metadata: Metadata = {
  title: "Activity",
};

function formatWhen(date: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default async function ActivityPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { activities } = await listProjectActivity(slug);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      <div className="space-y-1">
        <h2 className="font-heading text-2xl tracking-tight">Activity</h2>
        <p className="text-muted-foreground text-sm">
          Project events you are authorized to see. Private items never appear
          for collaborators.
        </p>
      </div>

      {activities.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No activity yet</CardTitle>
            <CardDescription>
              Creates, approvals, uploads, and settlements will show up here.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <ul className="divide-border border-border divide-y rounded-lg border">
          {activities.map((item) => (
            <li key={item.id} className="px-4 py-3 sm:px-5">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                {item.href ? (
                  <Link
                    href={item.href}
                    className="text-foreground hover:text-primary text-sm font-medium"
                  >
                    {item.message}
                  </Link>
                ) : (
                  <p className="text-sm font-medium">{item.message}</p>
                )}
                <time
                  className="text-muted-foreground shrink-0 text-xs"
                  dateTime={item.createdAt.toISOString()}
                >
                  {formatWhen(item.createdAt)}
                </time>
              </div>
              {item.actor.name || item.actor.email ? (
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {item.actor.name ?? item.actor.email}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <Card>
        <CardContent className="text-muted-foreground pt-6 text-xs">
          Looking for forensic history? Owners and admins can open{" "}
          <Link
            href={`/p/${slug}/audit`}
            className="underline underline-offset-2"
          >
            Audit log
          </Link>
          .
        </CardContent>
      </Card>
    </div>
  );
}
