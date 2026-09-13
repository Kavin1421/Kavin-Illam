import type { ProjectRole } from "@prisma/client";

import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { actorLabel, recordAuditEvent } from "@/server/audit/record";
import { requireProjectPermissionBySlug } from "@/server/authorization";
import { prisma } from "@/server/db/prisma";
import {
  removeMemberSchema,
  updateMemberRoleSchema,
} from "@/validators/projects";

export async function listProjectMembers(slug: string) {
  const ctx = await requireProjectPermissionBySlug(slug, "MEMBER_VIEW");

  const members = await prisma.projectMember.findMany({
    where: {
      projectId: ctx.project.id,
      status: { in: ["ACTIVE", "INVITED"] },
    },
    orderBy: { joinedAt: "asc" },
    select: {
      id: true,
      role: true,
      status: true,
      joinedAt: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
  });

  return { project: ctx.project, role: ctx.role, members };
}

export async function updateMemberRole(slug: string, input: unknown) {
  const ctx = await requireProjectPermissionBySlug(slug, "MEMBER_REMOVE");
  const parsed = updateMemberRoleSchema.safeParse(input);
  if (!parsed.success) {
    throw new AppError("VALIDATION", "Invalid member role update.");
  }

  const member = await prisma.projectMember.findFirst({
    where: {
      id: parsed.data.memberId,
      projectId: ctx.project.id,
      status: "ACTIVE",
    },
  });

  if (!member) {
    throw new AppError("NOT_FOUND", "Member was not found.");
  }

  if (member.role === "OWNER") {
    throw new AppError("FORBIDDEN", "Owner role cannot be changed this way.");
  }

  if (member.userId === ctx.user.id) {
    throw new AppError("FORBIDDEN", "You cannot change your own role.");
  }

  const updated = await prisma.projectMember.update({
    where: { id: member.id },
    data: { role: parsed.data.role as ProjectRole },
  });

  logger.info("Member role updated", {
    projectId: ctx.project.id,
    memberId: member.id,
    actorId: ctx.user.id,
    role: updated.role,
  });

  await recordAuditEvent({
    projectId: ctx.project.id,
    actorId: ctx.user.id,
    action: "CHANGE_PERMISSION",
    entityType: "ProjectMember",
    entityId: member.id,
    metadata: {
      userId: member.userId,
      fromRole: member.role,
      toRole: updated.role,
    },
    activity: {
      message: `${actorLabel(ctx.user)} changed a member role to ${updated.role}.`,
      href: `/p/${slug}/members`,
    },
  });

  return updated;
}

export async function removeMember(slug: string, input: unknown) {
  const ctx = await requireProjectPermissionBySlug(slug, "MEMBER_REMOVE");
  const parsed = removeMemberSchema.safeParse(input);
  if (!parsed.success) {
    throw new AppError("VALIDATION", "Invalid member removal request.");
  }

  const member = await prisma.projectMember.findFirst({
    where: {
      id: parsed.data.memberId,
      projectId: ctx.project.id,
      status: { in: ["ACTIVE", "INVITED"] },
    },
  });

  if (!member) {
    throw new AppError("NOT_FOUND", "Member was not found.");
  }

  if (member.role === "OWNER") {
    throw new AppError("FORBIDDEN", "Project owner cannot be removed.");
  }

  if (member.userId === ctx.user.id) {
    throw new AppError("FORBIDDEN", "You cannot remove yourself.");
  }

  const updated = await prisma.projectMember.update({
    where: { id: member.id },
    data: { status: "REMOVED" },
  });

  logger.info("Member removed", {
    projectId: ctx.project.id,
    memberId: member.id,
    actorId: ctx.user.id,
  });

  await recordAuditEvent({
    projectId: ctx.project.id,
    actorId: ctx.user.id,
    action: "REMOVE_MEMBER",
    entityType: "ProjectMember",
    entityId: member.id,
    metadata: { userId: member.userId, role: member.role },
    activity: {
      message: `${actorLabel(ctx.user)} removed a project member.`,
      href: `/p/${slug}/members`,
    },
  });

  return updated;
}

export async function ensureProjectMembership(params: {
  projectId: string;
  userId: string;
  role: ProjectRole;
  invitedById: string;
}) {
  const existing = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: {
        projectId: params.projectId,
        userId: params.userId,
      },
    },
  });

  if (existing) {
    if (existing.status === "ACTIVE") {
      return existing;
    }
    return prisma.projectMember.update({
      where: { id: existing.id },
      data: {
        status: "ACTIVE",
        role: params.role === "OWNER" ? "ENGINEER" : params.role,
        invitedById: params.invitedById,
        joinedAt: new Date(),
      },
    });
  }

  return prisma.projectMember.create({
    data: {
      projectId: params.projectId,
      userId: params.userId,
      role: params.role === "OWNER" ? "ENGINEER" : params.role,
      status: "ACTIVE",
      invitedById: params.invitedById,
    },
  });
}
