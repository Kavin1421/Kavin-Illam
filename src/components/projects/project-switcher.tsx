import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getOptionalUser } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";

export async function ProjectSwitcher({
  currentSlug,
}: {
  currentSlug?: string;
}) {
  const user = await getOptionalUser();
  if (!user) return null;

  const memberships = await prisma.projectMember.findMany({
    where: { userId: user.id, status: "ACTIVE" },
    select: {
      project: { select: { name: true, slug: true, status: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 20,
  });

  const projects = memberships
    .filter((m) => m.project.status !== "ARCHIVED")
    .map((m) => ({ name: m.project.name, slug: m.project.slug }));

  const current =
    projects.find((p) => p.slug === currentSlug) ?? projects[0] ?? null;

  return (
    <details className="relative">
      <summary
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "cursor-pointer list-none",
        )}
      >
        {current?.name ?? "Projects"} ▾
      </summary>
      <div className="border-border bg-background absolute right-0 z-50 mt-2 w-56 rounded-lg border p-1 shadow-sm">
        {projects.length === 0 ? (
          <p className="text-muted-foreground px-3 py-2 text-sm">
            No projects yet
          </p>
        ) : (
          projects.map((project) => (
            <Link
              key={project.slug}
              href={`/p/${project.slug}`}
              className={cn(
                "hover:bg-muted block rounded-md px-3 py-2 text-sm",
                project.slug === currentSlug && "bg-muted font-medium",
              )}
            >
              {project.name}
            </Link>
          ))
        )}
        <div className="border-border my-1 border-t" />
        <Link
          href="/projects"
          className="hover:bg-muted block rounded-md px-3 py-2 text-sm"
        >
          All projects
        </Link>
        <Link
          href="/projects/new"
          className="hover:bg-muted block rounded-md px-3 py-2 text-sm"
        >
          New project
        </Link>
      </div>
    </details>
  );
}
