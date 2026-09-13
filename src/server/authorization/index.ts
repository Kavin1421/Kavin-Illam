import type { Project, ProjectMember, ProjectRole } from "@prisma/client";

import { requireAuthenticatedUser } from "@/server/auth/session";

import {
  assertCanEditProjectResource,
  assertCanViewProjectResource,
  assertProjectMembership,
  assertProjectMembershipBySlug,
  assertProjectPermission,
  loadActiveProjectById,
  loadActiveProjectBySlug,
} from "./access";
import {
  type Permission,
} from "./permissions";
import type { VisibleResource } from "./visibility";

export type ProjectContext = {
  user: { id: string; name?: string | null; email?: string | null };
  project: Project;
  membership: ProjectMember;
  role: ProjectRole;
};

function toContext(
  user: { id: string; name?: string | null; email?: string | null },
  access: Awaited<ReturnType<typeof assertProjectMembership>>,
): ProjectContext {
  return {
    user,
    project: access.project,
    membership: access.membership,
    role: access.role,
  };
}

export async function resolveProjectById(projectId: string) {
  return loadActiveProjectById(projectId);
}

export async function resolveProjectBySlug(slug: string) {
  return loadActiveProjectBySlug(slug);
}

export async function requireProjectMember(
  projectId: string,
): Promise<ProjectContext> {
  const user = await requireAuthenticatedUser();
  const access = await assertProjectMembership(projectId, user.id);
  return toContext(user, access);
}

export async function requireProjectMemberBySlug(
  slug: string,
): Promise<ProjectContext> {
  const user = await requireAuthenticatedUser();
  const access = await assertProjectMembershipBySlug(slug, user.id);
  return toContext(user, access);
}

export async function requireProjectPermission(
  projectId: string,
  permission: Permission,
): Promise<ProjectContext> {
  const user = await requireAuthenticatedUser();
  const access = await assertProjectPermission(projectId, user.id, permission);
  return toContext(user, access);
}

export async function requireProjectPermissionBySlug(
  slug: string,
  permission: Permission,
): Promise<ProjectContext> {
  const project = await loadActiveProjectBySlug(slug);
  return requireProjectPermission(project.id, permission);
}

export async function requireCanViewResource(
  projectId: string,
  resource: VisibleResource,
): Promise<ProjectContext> {
  const user = await requireAuthenticatedUser();
  const access = await assertCanViewProjectResource(
    projectId,
    user.id,
    resource,
  );
  return toContext(user, access);
}

export async function requireCanEditResource(
  projectId: string,
  resource: VisibleResource,
): Promise<ProjectContext> {
  const user = await requireAuthenticatedUser();
  const access = await assertCanEditProjectResource(
    projectId,
    user.id,
    resource,
  );
  return toContext(user, access);
}

export {
  assertProjectMembership,
  assertProjectPermission,
  assertCanViewProjectResource,
  assertCanEditProjectResource,
  findActiveMembership,
} from "./access";
export {
  roleHasPermission,
  engineerForbiddenPermissions,
  engineerAllowedSamplePermissions,
} from "./permissions";
export type { Permission };
export {
  canViewResource,
  canEditResource,
  includeInSharedProjectTotals,
  filterVisibleResources,
  VISIBILITY,
  type Visibility,
  type VisibleResource,
} from "./visibility";
