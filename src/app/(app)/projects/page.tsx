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
import { requireAuthenticatedUser } from "@/server/auth/session";
import {
  listMyProjects,
  userCanCreateProject,
} from "@/server/projects/service";

export const metadata: Metadata = {
  title: "Projects",
};

export default async function ProjectsPage() {
  const user = await requireAuthenticatedUser();
  const [projects, canCreate] = await Promise.all([
    listMyProjects(),
    userCanCreateProject(user.id),
  ]);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <h1 className="font-heading text-3xl tracking-tight">Projects</h1>
          <p className="text-muted-foreground text-sm">
            Each project keeps finance, documents, and members isolated.
          </p>
        </div>
        {canCreate ? (
          <Link href="/projects/new" className={cn(buttonVariants())}>
            New project
          </Link>
        ) : null}
      </div>

      {projects.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No projects yet</CardTitle>
            <CardDescription>
              {canCreate
                ? "Create your first construction project to start tracking expenses and collaborators."
                : "You have not been added to a project yet. Ask a project owner for an invitation."}
            </CardDescription>
          </CardHeader>
          {canCreate ? (
            <CardContent>
              <Link href="/projects/new" className={cn(buttonVariants())}>
                Create project
              </Link>
            </CardContent>
          ) : null}
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

      {!canCreate && projects.length > 0 ? (
        <p className="text-muted-foreground text-sm">
          Only project owners can create additional projects. Contact an owner
          if you need a new workspace.
        </p>
      ) : null}
    </div>
  );
}
