import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { CreateProjectForm } from "@/components/projects/project-forms";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireAuthenticatedUser } from "@/server/auth/session";
import { userCanCreateProject } from "@/server/projects/service";

export const metadata: Metadata = {
  title: "New project",
};

export default async function NewProjectPage() {
  const user = await requireAuthenticatedUser();
  const allowed = await userCanCreateProject(user.id);
  if (!allowed) {
    redirect("/projects");
  }

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-8 sm:px-6 sm:py-10">
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-2xl">New project</CardTitle>
          <CardDescription>
            Only the platform superadmin can create projects. You will be the
            owner; invite engineers and other collaborators from Members.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CreateProjectForm />
        </CardContent>
      </Card>
    </div>
  );
}
