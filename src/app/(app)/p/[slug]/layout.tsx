import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { ProjectSwitcher } from "@/components/projects/project-switcher";
import { buttonVariants } from "@/components/ui/button";
import { AppError } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { requireProjectMemberBySlug } from "@/server/authorization";

type ProjectLayoutProps = {
  children: ReactNode;
  params: Promise<{ slug: string }>;
};

export default async function ProjectLayout({
  children,
  params,
}: ProjectLayoutProps) {
  const { slug } = await params;

  let projectName = slug;
  try {
    const ctx = await requireProjectMemberBySlug(slug);
    projectName = ctx.project.name;
  } catch (error) {
    if (
      error instanceof AppError &&
      (error.code === "NOT_FOUND" || error.code === "FORBIDDEN")
    ) {
      notFound();
    }
    throw error;
  }

  const nav = [
    { href: `/p/${slug}`, label: "Overview" },
    { href: `/p/${slug}/finance`, label: "Finance" },
    { href: `/p/${slug}/advances`, label: "Advances" },
    { href: `/p/${slug}/payment-requests`, label: "Requests" },
    { href: `/p/${slug}/members`, label: "Members" },
    { href: `/p/${slug}/settings`, label: "Settings" },
  ];

  return (
    <>
      <div className="border-border/80 border-b">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-muted-foreground text-xs tracking-wide uppercase">
                Project
              </p>
              <h1 className="font-heading text-2xl tracking-tight">
                {projectName}
              </h1>
            </div>
            <ProjectSwitcher currentSlug={slug} />
          </div>
          <nav className="flex flex-wrap gap-2">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
      {children}
    </>
  );
}
