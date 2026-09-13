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
import { formatInrFromPaise } from "@/lib/money";
import { cn } from "@/lib/utils";
import {
  countPendingAccessRequests,
  listMyAccessRequests,
} from "@/server/access-requests/service";
import { requireAuthenticatedUser } from "@/server/auth/session";
import { resolveIsSuperadmin } from "@/server/auth/superadmin";
import {
  listMyProjects,
  userCanCreateProject,
} from "@/server/projects/service";

export const metadata: Metadata = {
  title: "Projects",
};

export default async function ProjectsPage() {
  const user = await requireAuthenticatedUser();
  const isSuperadmin = await resolveIsSuperadmin({
    id: user.id,
    email: user.email,
  });
  const [projects, canCreate, pendingCount, myRequests] = await Promise.all([
    listMyProjects(),
    userCanCreateProject(user.id),
    countPendingAccessRequests(),
    isSuperadmin ? Promise.resolve([]) : listMyAccessRequests(),
  ]);

  const pendingMine = myRequests.filter((r) => r.status === "PENDING").length;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8">
      {isSuperadmin && pendingCount > 0 ? (
        <Card className="border-cta/30 bg-cta/10">
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
            <div>
              <CardTitle className="text-base">
                {pendingCount} access request{pendingCount === 1 ? "" : "s"}{" "}
                waiting
              </CardTitle>
              <CardDescription>
                Open Access requests in the sidebar to approve or reject.
              </CardDescription>
            </div>
            <Link href="/admin/access-requests" className={cn(buttonVariants())}>
              Review now
            </Link>
          </CardHeader>
        </Card>
      ) : null}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <h1 className="font-heading text-3xl tracking-tight">Projects</h1>
          <p className="text-muted-foreground text-sm">
            Each project keeps finance, documents, and members isolated.
            {isSuperadmin
              ? " You are the platform superadmin."
              : " New workspaces require superadmin approval."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isSuperadmin ? (
            <Link
              href="/admin/access-requests"
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              Access requests
              {pendingCount > 0 ? ` (${pendingCount})` : ""}
            </Link>
          ) : (
            <Link
              href="/projects/request"
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              Request access
              {pendingMine > 0 ? ` (${pendingMine})` : ""}
            </Link>
          )}
          {canCreate ? (
            <Link href="/projects/new" className={cn(buttonVariants())}>
              New project
            </Link>
          ) : null}
        </div>
      </div>

      {projects.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No projects yet</CardTitle>
            <CardDescription>
              {canCreate
                ? "Create the first construction project, or approve access requests from users."
                : "You are not on a project yet. Request to join an existing one, request a new project, or wait for an invitation."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {canCreate ? (
              <Link href="/projects/new" className={cn(buttonVariants())}>
                Create project
              </Link>
            ) : (
              <Link href="/projects/request" className={cn(buttonVariants())}>
                Request access
              </Link>
            )}
            {isSuperadmin ? (
              <Link
                href="/admin/access-requests"
                className={cn(buttonVariants({ variant: "outline" }))}
              >
                Review requests
              </Link>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/p/${project.slug}`}
              className="block"
            >
              <Card className="hover:border-foreground/20 h-full transition-colors">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="font-heading text-xl">
                      {project.name}
                    </CardTitle>
                    <Badge variant="secondary">{project.role}</Badge>
                  </div>
                  <CardDescription>
                    {project.projectType.replaceAll("_", " ")} ·{" "}
                    {project.status}
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-muted-foreground text-sm">
                  {project.estimatedBudget != null
                    ? `Budget ${formatInrFromPaise(project.estimatedBudget)}`
                    : "No budget set"}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {!canCreate ? (
        <p className="text-muted-foreground text-sm">
          Only the platform superadmin can create projects automatically. Use{" "}
          <Link href="/projects/request" className="underline">
            Request access
          </Link>{" "}
          to join an existing project or propose a new one.
        </p>
      ) : null}
    </div>
  );
}
