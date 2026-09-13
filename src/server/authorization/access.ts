import type { Project, ProjectMember, ProjectRole } from "@prisma/client";

import { AppError } from "@/lib/errors";
import { prisma } from "@/server/db/prisma";

import { roleHasPermission, type Permission } from "./permissions";
import {
  canEditResource,
  canViewResource,
  type VisibleResource,
  type VisibilityViewer,
} from "./visibility";

export type ProjectAccess = {
  userId: string;
  project: Project;
  membership: ProjectMember;
  role: ProjectRole;
};

/**
 * Resolve active membership for a user/project pair.
 * Returns null when the user is not an active member (do not distinguish why to callers).
 */
export async function findActiveMembership(
  projectId: string,
  userId: string,
): Promise<ProjectMember | null> {
  const membership = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: { projectId, userId },
    },
  });

  if (!membership || membership.status !== "ACTIVE") {
    return null;
  }

  return membership;
}

/**
 * Load a non-archived project or throw NOT_FOUND.
 * Used by both session wrappers and tests.
 */
export async function loadActiveProjectById(
  projectId: string,
): Promise<Project> {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project || project.status === "ARCHIVED") {
    throw new AppError("NOT_FOUND", "Project was not found.");
  }
  return project;
}

export async function loadActiveProjectBySlug(slug: string): Promise<Project> {
  const project = await prisma.project.findUnique({ where: { slug } });
  if (!project || project.status === "ARCHIVED") {
    throw new AppError("NOT_FOUND", "Project was not found.");
  }
  return project;
}

/**
 * Core project access check — injectable userId for independent testing.
 * Non-members receive NOT_FOUND (not FORBIDDEN) to avoid project-id enumeration.
 */
export async function assertProjectMembership(
  projectId: string,
  userId: string,
): Promise<ProjectAccess> {
  const project = await loadActiveProjectById(projectId);
  const membership = await findActiveMembership(project.id, userId);

  if (!membership) {
    throw new AppError("NOT_FOUND", "Project was not found.");
  }

  return {
    userId,
    project,
    membership,
    role: membership.role,
  };
}

export async function assertProjectPermission(
  projectId: string,
  userId: string,
  permission: Permission,
): Promise<ProjectAccess> {
  const access = await assertProjectMembership(projectId, userId);
  if (!roleHasPermission(access.role, permission)) {
    throw new AppError(
      "FORBIDDEN",
      "You do not have permission to perform this action.",
    );
  }
  return access;
}

export async function assertProjectMembershipBySlug(
  slug: string,
  userId: string,
): Promise<ProjectAccess> {
  const project = await loadActiveProjectBySlug(slug);
  return assertProjectMembership(project.id, userId);
}

export async function assertCanViewProjectResource(
  projectId: string,
  userId: string,
  resource: VisibleResource,
): Promise<ProjectAccess> {
  const access = await assertProjectMembership(projectId, userId);

  if (!assertResourceInProject(resource, projectId)) {
    throw new AppError("NOT_FOUND", "Resource was not found.");
  }

  const viewer: VisibilityViewer = {
    userId,
    role: access.role,
  };

  if (!canViewResource(viewer, resource, projectId)) {
    throw new AppError("NOT_FOUND", "Resource was not found.");
  }

  return access;
}

export async function assertCanEditProjectResource(
  projectId: string,
  userId: string,
  resource: VisibleResource,
): Promise<ProjectAccess> {
  const access = await assertProjectMembership(projectId, userId);

  if (!assertResourceInProject(resource, projectId)) {
    throw new AppError("NOT_FOUND", "Resource was not found.");
  }

  const viewer: VisibilityViewer = {
    userId,
    role: access.role,
  };

  if (!canEditResource(viewer, resource, projectId)) {
    throw new AppError(
      "FORBIDDEN",
      "You do not have permission to edit this resource.",
    );
  }

  return access;
}

export function assertResourceInProject(
  resource: Pick<VisibleResource, "projectId">,
  projectId: string,
): boolean {
  return resource.projectId === projectId;
}
