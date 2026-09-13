import type { Metadata } from "next";

import { CreateProjectForm } from "@/components/projects/project-forms";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "New project",
};

export default function NewProjectPage() {
  return (
    <div className="mx-auto w-full max-w-lg px-4 py-10 sm:px-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-2xl">New project</CardTitle>
          <CardDescription>
            You will be the owner. Invite engineers and other collaborators from
            the project members page.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CreateProjectForm />
        </CardContent>
      </Card>
    </div>
  );
}
