import type { ProjectRole } from "@prisma/client";

/**
 * Only project owners may create additional projects.
 * Bootstrap: users with zero memberships may create their first project.
 * Engineers and other non-owner roles cannot add another project.
 */
export function canCreateProjectFromRoles(roles: ProjectRole[]): boolean {
  if (roles.length === 0) return true;
  return roles.includes("OWNER");
}
