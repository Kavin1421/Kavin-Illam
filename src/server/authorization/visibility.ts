/**
 * Resource visibility — server-side only.
 * PRIVATE personal records must never appear in shared totals, exports, or collaborator APIs.
 */

export const VISIBILITY = {
  PRIVATE: "PRIVATE",
  PROJECT_SHARED: "PROJECT_SHARED",
  RESTRICTED: "RESTRICTED",
} as const;

export type Visibility = (typeof VISIBILITY)[keyof typeof VISIBILITY];

export type VisibleResource = {
  projectId: string;
  visibility: Visibility;
  createdById: string;
  /** Explicit ACL for RESTRICTED visibility */
  allowedUserIds?: readonly string[] | null;
  deletedAt?: Date | string | null;
};

export type VisibilityViewer = {
  userId: string;
  /** Project role of the viewer within the resource's project */
  role:
    | "OWNER"
    | "ADMIN"
    | "ENGINEER"
    | "CONTRACTOR"
    | "ARCHITECT"
    | "ACCOUNTANT"
    | "VIEWER";
};

/**
 * Whether the viewer may see this resource after project membership is already established.
 * Callers must still enforce project membership separately.
 */
export function canViewResource(
  viewer: VisibilityViewer,
  resource: VisibleResource,
  expectedProjectId: string,
): boolean {
  if (resource.projectId !== expectedProjectId) {
    return false;
  }

  if (resource.deletedAt) {
    // Soft-deleted records: project OWNER only (audit / recovery path)
    return viewer.role === "OWNER";
  }

  if (resource.createdById === viewer.userId) {
    return true;
  }

  switch (resource.visibility) {
    case "PRIVATE":
      // Project owner may oversee private records; collaborators never can.
      return viewer.role === "OWNER";
    case "PROJECT_SHARED":
      return true;
    case "RESTRICTED": {
      const allowed = resource.allowedUserIds ?? [];
      return viewer.role === "OWNER" || allowed.includes(viewer.userId);
    }
    default:
      return false;
  }
}

export function canEditResource(
  viewer: VisibilityViewer,
  resource: VisibleResource,
  expectedProjectId: string,
): boolean {
  if (!canViewResource(viewer, resource, expectedProjectId)) {
    return false;
  }
  if (resource.deletedAt) {
    return false;
  }
  if (resource.createdById === viewer.userId) {
    return true;
  }
  // Non-creators need elevated roles; PRIVATE never editable by others (including OWNER overwrite via this helper — use explicit admin path later)
  if (resource.visibility === "PRIVATE") {
    return false;
  }
  return viewer.role === "OWNER" || viewer.role === "ADMIN";
}

/**
 * Shared project accounting / collaborator dashboards must exclude PRIVATE rows.
 * RESTRICTED rows are excluded from shared aggregates unless the viewer is allowed
 * (handled by filtering the authorized dataset first).
 */
export function includeInSharedProjectTotals(
  resource: VisibleResource,
): boolean {
  if (resource.deletedAt) return false;
  return resource.visibility === "PROJECT_SHARED";
}

export function filterVisibleResources<T extends VisibleResource>(
  viewer: VisibilityViewer,
  resources: readonly T[],
  expectedProjectId: string,
): T[] {
  return resources.filter((resource) =>
    canViewResource(viewer, resource, expectedProjectId),
  );
}

export function assertResourceBelongsToProject(
  resourceProjectId: string,
  projectId: string,
): boolean {
  return resourceProjectId === projectId;
}
