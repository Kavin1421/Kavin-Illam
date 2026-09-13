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
import { getProjectForMember } from "@/server/projects/service";

export const metadata: Metadata = {
  title: "Project overview",
};

export default async function ProjectOverviewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { project, role } = await getProjectForMember(slug);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{role}</Badge>
        <Badge variant="outline">{project.status}</Badge>
        <Badge variant="outline">
          {project.projectType.replaceAll("_", " ")}
        </Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Budget</CardTitle>
            <CardDescription>Planned project budget</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-medium tracking-tight">
            {project.estimatedBudget != null
              ? formatInrFromPaise(project.estimatedBudget)
              : "—"}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Currency</CardTitle>
            <CardDescription>Reporting currency</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-medium tracking-tight">
            {project.currency}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Your role</CardTitle>
            <CardDescription>Permissions follow this role</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-medium tracking-tight">
            {role}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
          <CardDescription>
            {project.description || "No description yet."}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-muted-foreground space-y-2 text-sm">
          <p>Address: {project.address || "—"}</p>
          <div className="flex flex-wrap gap-2 pt-2">
            <Link
              href={`/p/${slug}/finance`}
              className={cn(buttonVariants({ size: "sm" }))}
            >
              Finance
            </Link>
            <Link
              href={`/p/${slug}/advances`}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Advances
            </Link>
            <Link
              href={`/p/${slug}/payment-requests`}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Requests
            </Link>
            <Link
              href={`/p/${slug}/members`}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Members
            </Link>
            <Link
              href={`/p/${slug}/settings`}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Settings
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
