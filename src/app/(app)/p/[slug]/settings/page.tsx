import type { Metadata } from "next";

import { EditProjectForm } from "@/components/projects/project-forms";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { roleHasPermission } from "@/server/authorization";
import { archiveProjectAction } from "@/server/projects/actions";
import { getProjectForMember } from "@/server/projects/service";

export const metadata: Metadata = {
  title: "Project settings",
};

export default async function ProjectSettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { project, role } = await getProjectForMember(slug);
  const canEdit = roleHasPermission(role, "PROJECT_EDIT");

  const budgetRupees =
    project.estimatedBudget != null
      ? (project.estimatedBudget / 100).toFixed(2)
      : "";

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8 sm:px-6">
      <div className="space-y-1">
        <h2 className="font-heading text-2xl tracking-tight">Settings</h2>
        <p className="text-muted-foreground text-sm">
          Update project details for {project.name}.
        </p>
      </div>

      {canEdit ? (
        <Card>
          <CardHeader>
            <CardTitle>Project details</CardTitle>
          </CardHeader>
          <CardContent>
            <EditProjectForm
              slug={slug}
              defaults={{
                name: project.name,
                description: project.description,
                projectType: project.projectType,
                address: project.address,
                status: project.status,
                estimatedBudgetRupees: budgetRupees,
              }}
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Read only</CardTitle>
            <CardDescription>
              You do not have permission to edit this project.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {canEdit && (role === "OWNER" || role === "ADMIN") ? (
        <Card>
          <CardHeader>
            <CardTitle>Archive project</CardTitle>
            <CardDescription>
              Archived projects are hidden from the switcher and project list.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={archiveProjectAction.bind(null, slug)}>
              <Button type="submit" variant="destructive">
                Archive project
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
