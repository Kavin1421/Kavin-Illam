import type { Project, ProjectMember, ProjectRole } from "@prisma/client";

import { AppError } from "@/lib/errors";
import { requireAuthenticatedUser } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";

import {
  roleHasPermission,
  type Permission,
} from "./permissions";

export type ProjectContext = {
  user: { id: string; name?: string | null; email?: string | null };
  project: Project;
  membership: ProjectMember;
  role: ProjectRole;
};

export async function resolveProjectById(projectId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project || project.status === "ARCHIVED") {
    throw new AppError("NOT_FOUND", "Project was not found.");
  }
  return project;
}

export async function resolveProjectBySlug(slug: string) {
  const project = await prisma.project.findUnique({ where: { slug } });
  if (!project || project.status === "ARCHIVED") {
    throw new AppError("NOT_FOUND", "Project was not found.");
  }
  return project;
}

export async function requireProjectMember(
  projectId: string,
): Promise<ProjectContext> {
  const user = await requireAuthenticatedUser();
  const project = await resolveProjectById(projectId);

  const membership = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: {
        projectId: project.id,
        userId: user.id,
      },
    },
  });

  if (!membership || membership.status !== "ACTIVE") {
    throw new AppError(
      "FORBIDDEN",
      "You are not a member of this project.",
    );
  }

  return {
    user,
    project,
    membership,
    role: membership.role,
  };
}

export async function requireProjectMemberBySlug(
  slug: string,
): Promise<ProjectContext> {
  const project = await resolveProjectBySlug(slug);
  return requireProjectMember(project.id);
}

export async function requireProjectPermission(
  projectId: string,
  permission: Permission,
): Promise<ProjectContext> {
  const ctx = await requireProjectMember(projectId);
  if (!roleHasPermission(ctx.role, permission)) {
    throw new AppError(
      "FORBIDDEN",
      "You do not have permission to perform this action.",
    );
  }
  return ctx;
}

export async function requireProjectPermissionBySlug(
  slug: string,
  permission: Permission,
): Promise<ProjectContext> {
  const project = await resolveProjectBySlug(slug);
  return requireProjectPermission(project.id, permission);
}

export { roleHasPermission };
export type { Permission };
