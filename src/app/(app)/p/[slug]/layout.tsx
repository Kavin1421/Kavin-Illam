import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { AppError } from "@/lib/errors";
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
  let projectType = "PROJECT";
  let status = "ACTIVE";
  try {
    const ctx = await requireProjectMemberBySlug(slug);
    projectName = ctx.project.name;
    projectType = ctx.project.projectType;
    status = ctx.project.status;
  } catch (error) {
    if (
      error instanceof AppError &&
      (error.code === "NOT_FOUND" || error.code === "FORBIDDEN")
    ) {
      notFound();
    }
    throw error;
  }

  return (
    <div className="space-y-6">
      <header className="surface-card relative overflow-hidden rounded-2xl border border-white/10 p-5 sm:p-6">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(0,208,132,0.16),transparent_50%),radial-gradient(ellipse_at_bottom_left,rgba(34,211,238,0.08),transparent_45%)]"
        />
        <div
          aria-hidden
          className="texture-blueprint pointer-events-none absolute inset-0 opacity-40"
        />
        <div className="relative z-10 flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-2">
            <p className="text-[11px] font-medium tracking-[0.14em] text-mint/70 uppercase">
              Project
            </p>
            <h1 className="font-heading text-3xl tracking-[-0.03em] text-white sm:text-[2.125rem]">
              {projectName}
            </h1>
            <div className="flex flex-wrap gap-2 pt-1">
              <Badge className="border-cta/30 bg-cta/15 text-mint hover:bg-cta/20">
                {status}
              </Badge>
              <Badge
                variant="outline"
                className="border-white/15 bg-transparent text-muted-white"
              >
                {projectType.replaceAll("_", " ")}
              </Badge>
            </div>
          </div>
          <p className="max-w-xs text-sm text-muted-white">
            Every rupee. Every document. Every milestone.
          </p>
        </div>
      </header>
      {children}
    </div>
  );
}
