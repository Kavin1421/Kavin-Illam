import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import {
  RequestCreateForm,
  RequestJoinForm,
} from "@/components/projects/access-request-forms";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  listJoinableProjects,
  listMyAccessRequests,
} from "@/server/access-requests/service";
import { requireAuthenticatedUser } from "@/server/auth/session";
import { resolveIsSuperadmin } from "@/server/auth/superadmin";

export const metadata: Metadata = {
  title: "Request access",
};

export default async function RequestAccessPage() {
  const user = await requireAuthenticatedUser();
  if (await resolveIsSuperadmin({ id: user.id, email: user.email })) {
    redirect("/admin/access-requests");
  }

  const [joinable, mine] = await Promise.all([
    listJoinableProjects(),
    listMyAccessRequests(),
  ]);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8">
      <div className="space-y-2">
        <h1 className="font-heading text-3xl tracking-tight">Request access</h1>
        <p className="text-muted-foreground text-sm">
          Only the platform superadmin can create projects or add members
          without an invitation. Submit a join or create request for approval.
        </p>
        <Link href="/projects" className={cn(buttonVariants({ variant: "ghost" }))}>
          Back to projects
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Join existing project</CardTitle>
            <CardDescription>
              Ask to be added to a project that already exists.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RequestJoinForm projects={joinable} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Request new project</CardTitle>
            <CardDescription>
              Propose a new workspace. Nothing is created until approved.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RequestCreateForm />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your requests</CardTitle>
          <CardDescription>Recent join and create requests.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {mine.length === 0 ? (
            <p className="text-muted-foreground text-sm">No requests yet.</p>
          ) : (
            mine.map((request) => (
              <div
                key={request.id}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 py-2 text-sm last:border-0"
              >
                <div>
                  <p className="font-medium">
                    {request.type === "JOIN_PROJECT"
                      ? `Join ${request.project?.name ?? "project"}`
                      : `Create ${request.proposedName ?? "project"}`}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {request.createdAt.toLocaleString("en-IN")}
                  </p>
                </div>
                <Badge variant="secondary">{request.status}</Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
