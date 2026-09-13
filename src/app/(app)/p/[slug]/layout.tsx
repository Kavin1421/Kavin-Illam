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
    <div className="space-y-5">
      <header className="surface-glass relative min-h-[7.5rem] overflow-hidden rounded-[1.25rem] border border-white/[0.09] px-5 py-4 backdrop-blur-[16px] sm:px-6 sm:py-5">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(0,208,132,0.12),transparent_48%),radial-gradient(ellipse_at_bottom_left,rgba(34,211,238,0.05),transparent_42%)]"
        />
        <div
          aria-hidden
          className="texture-blueprint pointer-events-none absolute inset-0 opacity-30"
        />
        <div className="relative z-10 flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-1.5">
            <p className="text-[11px] font-medium tracking-[0.14em] text-mint/70 uppercase">
              Project
            </p>
            <h1 className="font-heading text-[1.75rem] leading-tight tracking-[-0.03em] text-white sm:text-[2rem]">
              {projectName}
            </h1>
            <div className="flex flex-wrap gap-2 pt-0.5">
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
          <p className="max-w-xs text-sm leading-relaxed text-muted-white">
            Every rupee. Every document. Every milestone.
          </p>
        </div>
      </header>
      {children}
    </div>
  );
}
