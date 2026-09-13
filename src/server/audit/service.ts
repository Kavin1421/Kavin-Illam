import type { Visibility } from "@prisma/client";

import {
  canViewResource,
  requireProjectPermissionBySlug,
  roleHasPermission,
  type VisibleResource,
} from "@/server/authorization";
import { prisma } from "@/server/db/prisma";

function toVisibleResource(row: {
  projectId: string;
  visibility: Visibility;
  createdById: string;
  allowedUserIds: string[];
}): VisibleResource {
  return {
    projectId: row.projectId,
    visibility: row.visibility,
    createdById: row.createdById,
    allowedUserIds: row.allowedUserIds,
    deletedAt: null,
  };
}

export async function listProjectActivity(slug: string, take = 50) {
  const ctx = await requireProjectPermissionBySlug(slug, "PROJECT_VIEW");
  const rows = await prisma.activity.findMany({
    where: { projectId: ctx.project.id },
    orderBy: { createdAt: "desc" },
    take: Math.min(take, 100),
    include: {
      actor: { select: { id: true, name: true, email: true } },
    },
  });

  const viewer = { userId: ctx.user.id, role: ctx.role };
  const activities = rows.filter((row) =>
    canViewResource(viewer, toVisibleResource(row), ctx.project.id),
  );

  return { project: ctx.project, role: ctx.role, activities };
}

export async function listProjectAuditLog(slug: string, take = 100) {
  const ctx = await requireProjectPermissionBySlug(slug, "AUDIT_VIEW");
  const entries = await prisma.auditLog.findMany({
    where: { projectId: ctx.project.id },
    orderBy: { createdAt: "desc" },
    take: Math.min(take, 200),
    include: {
      actor: { select: { id: true, name: true, email: true } },
    },
  });

  return {
    project: ctx.project,
    role: ctx.role,
    entries,
    canViewAudit: roleHasPermission(ctx.role, "AUDIT_VIEW"),
  };
}
