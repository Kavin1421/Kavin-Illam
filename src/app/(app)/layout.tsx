import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { AppShellFrame } from "@/components/layout/app-shell";
import { getOptionalUser } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";

export default async function AppSectionLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getOptionalUser();
  if (!user) {
    redirect("/login");
  }

  const memberships = await prisma.projectMember.findMany({
    where: { userId: user.id, status: "ACTIVE" },
    select: {
      role: true,
      project: {
        select: { name: true, slug: true, status: true, projectType: true },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 30,
  });

  const projects = memberships
    .filter((m) => m.project.status !== "ARCHIVED")
    .map((m) => ({
      name: m.project.name,
      slug: m.project.slug,
      projectType: m.project.projectType,
      status: m.project.status,
      role: m.role,
    }));

  return (
    <AppShellFrame
      user={{ name: user.name, email: user.email }}
      projects={projects}
    >
      {children}
    </AppShellFrame>
  );
}
