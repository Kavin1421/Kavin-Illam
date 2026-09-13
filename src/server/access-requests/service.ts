import type { ProjectRole, ProjectType } from "@prisma/client";

import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { absoluteUrl, sendEmail } from "@/server/email/send";
import { requireAuthenticatedUser } from "@/server/auth/session";
import {
  getSuperadminEmails,
  isSuperadminEmail,
  resolveIsSuperadmin,
} from "@/server/auth/superadmin";
import { prisma } from "@/server/db/prisma";
import { projectAccessRequests } from "@/server/db/access-requests-prisma";
import { createProject } from "@/server/projects/service";
import { ensureProjectMembership } from "@/server/projects/members";
import {
  requestCreateProjectSchema,
  requestJoinProjectSchema,
  reviewAccessRequestSchema,
} from "@/validators/access-requests";

async function requireSuperadminUser() {
  const sessionUser = await requireAuthenticatedUser();
  if (
    !(await resolveIsSuperadmin({
      id: sessionUser.id,
      email: sessionUser.email,
    }))
  ) {
    throw new AppError(
      "FORBIDDEN",
      "Only the platform superadmin can review access requests.",
    );
  }
  return sessionUser;
}

export async function listJoinableProjects() {
  const user = await requireAuthenticatedUser();
  const memberships = await prisma.projectMember.findMany({
    where: { userId: user.id, status: "ACTIVE" },
    select: { projectId: true },
  });
  const memberOf = new Set(memberships.map((m) => m.projectId));

  const projects = await prisma.project.findMany({
    where: { status: { in: ["ACTIVE", "ON_HOLD"] } },
    select: { id: true, name: true, slug: true, projectType: true, status: true },
    orderBy: { name: "asc" },
    take: 100,
  });

  return projects.filter((project) => !memberOf.has(project.id));
}

export async function listMyAccessRequests() {
  const user = await requireAuthenticatedUser();
  return projectAccessRequests().findMany({
    where: { requesterId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      project: { select: { id: true, name: true, slug: true } },
    },
  });
}

export async function listPendingAccessRequests() {
  await requireSuperadminUser();
  return projectAccessRequests().findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    take: 100,
    include: {
      requester: { select: { id: true, name: true, email: true } },
      project: { select: { id: true, name: true, slug: true } },
    },
  });
}

export async function countPendingAccessRequests(): Promise<number> {
  const user = await requireAuthenticatedUser();
  if (!(await resolveIsSuperadmin({ id: user.id, email: user.email }))) {
    return 0;
  }
  return projectAccessRequests().count({ where: { status: "PENDING" } });
}

async function notifySuperadmins(subject: string, text: string, href: string) {
  const emails = getSuperadminEmails();
  const users = await prisma.user.findMany({
    where: { email: { in: emails } },
    select: { email: true },
  });
  const recipients = users
    .map((u) => u.email)
    .filter((email): email is string => Boolean(email));

  if (recipients.length === 0) {
    logger.info("Access request created; no superadmin user account yet", {
      subject,
    });
    return;
  }

  const url = absoluteUrl(href);
  await Promise.allSettled(
    recipients.map((to) =>
      sendEmail({
        to,
        subject,
        text: `${text}\n\nReview: ${url}`,
        html: `<p>${text}</p><p><a href="${url}">Review requests</a></p>`,
      }),
    ),
  );
}

export async function requestJoinProject(input: unknown) {
  const user = await requireAuthenticatedUser();
  if (isSuperadminEmail(user.email)) {
    throw new AppError(
      "VALIDATION",
      "Superadmin can open projects directly — no join request needed.",
    );
  }

  const parsed = requestJoinProjectSchema.safeParse(input);
  if (!parsed.success) {
    throw new AppError("VALIDATION", "Choose a project to join.");
  }

  const project = await prisma.project.findFirst({
    where: {
      id: parsed.data.projectId,
      status: { in: ["ACTIVE", "ON_HOLD"] },
    },
  });
  if (!project) {
    throw new AppError("NOT_FOUND", "Project was not found.");
  }

  const existingMember = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: { projectId: project.id, userId: user.id },
    },
  });
  if (existingMember?.status === "ACTIVE") {
    throw new AppError("CONFLICT", "You are already a member of this project.");
  }

  const pending = await projectAccessRequests().findFirst({
    where: {
      requesterId: user.id,
      projectId: project.id,
      type: "JOIN_PROJECT",
      status: "PENDING",
    },
  });
  if (pending) {
    throw new AppError(
      "CONFLICT",
      "You already have a pending join request for this project.",
    );
  }

  const request = await projectAccessRequests().create({
    data: {
      type: "JOIN_PROJECT",
      status: "PENDING",
      requesterId: user.id,
      projectId: project.id,
      requestedRole: parsed.data.requestedRole as ProjectRole,
      message: parsed.data.message?.trim() || null,
    },
  });

  await notifySuperadmins(
    `Join request: ${project.name}`,
    `${user.name ?? user.email} requested to join “${project.name}” as ${parsed.data.requestedRole}.`,
    "/admin/access-requests",
  );

  logger.info("Join project request created", {
    requestId: request.id,
    projectId: project.id,
    requesterId: user.id,
  });

  return request;
}

export async function requestCreateProject(input: unknown) {
  const user = await requireAuthenticatedUser();
  if (isSuperadminEmail(user.email)) {
    throw new AppError(
      "VALIDATION",
      "Superadmin can create projects directly from New project.",
    );
  }

  const parsed = requestCreateProjectSchema.safeParse(input);
  if (!parsed.success) {
    throw new AppError("VALIDATION", "Please check the proposed project details.");
  }

  const pending = await projectAccessRequests().findFirst({
    where: {
      requesterId: user.id,
      type: "CREATE_PROJECT",
      status: "PENDING",
      proposedName: parsed.data.proposedName,
    },
  });
  if (pending) {
    throw new AppError(
      "CONFLICT",
      "You already have a pending create request for this project name.",
    );
  }

  const request = await projectAccessRequests().create({
    data: {
      type: "CREATE_PROJECT",
      status: "PENDING",
      requesterId: user.id,
      proposedName: parsed.data.proposedName,
      proposedType: parsed.data.proposedType as ProjectType,
      proposedDescription: parsed.data.proposedDescription?.trim() || null,
      proposedAddress: parsed.data.proposedAddress?.trim() || null,
      message: parsed.data.message?.trim() || null,
      requestedRole: "OWNER",
    },
  });

  await notifySuperadmins(
    `New project request: ${parsed.data.proposedName}`,
    `${user.name ?? user.email} requested a new project “${parsed.data.proposedName}”.`,
    "/admin/access-requests",
  );

  logger.info("Create project request created", {
    requestId: request.id,
    requesterId: user.id,
  });

  return request;
}

export async function reviewAccessRequest(input: unknown) {
  const admin = await requireSuperadminUser();
  const parsed = reviewAccessRequestSchema.safeParse(input);
  if (!parsed.success) {
    throw new AppError("VALIDATION", "Invalid review decision.");
  }

  const request = await projectAccessRequests().findUnique({
    where: { id: parsed.data.requestId },
    include: {
      requester: { select: { id: true, name: true, email: true } },
      project: { select: { id: true, name: true, slug: true } },
    },
  });
  if (!request) {
    throw new AppError("NOT_FOUND", "Access request was not found.");
  }
  if (request.status !== "PENDING") {
    throw new AppError("CONFLICT", "This request was already reviewed.");
  }

  if (parsed.data.decision === "REJECT") {
    const updated = await projectAccessRequests().update({
      where: { id: request.id },
      data: {
        status: "REJECTED",
        reviewedById: admin.id,
        reviewedAt: new Date(),
        reviewNote: parsed.data.reviewNote?.trim() || null,
      },
    });
    logger.info("Access request rejected", {
      requestId: request.id,
      reviewerId: admin.id,
    });
    return updated;
  }

  // APPROVE
  if (request.type === "JOIN_PROJECT") {
    if (!request.projectId) {
      throw new AppError("VALIDATION", "Join request is missing a project.");
    }
    const role =
      (parsed.data.role as ProjectRole | undefined) ?? request.requestedRole;

    await ensureProjectMembership({
      projectId: request.projectId,
      userId: request.requesterId,
      role: role === "OWNER" ? "ADMIN" : role,
      invitedById: admin.id,
    });

    const updated = await projectAccessRequests().update({
      where: { id: request.id },
      data: {
        status: "APPROVED",
        reviewedById: admin.id,
        reviewedAt: new Date(),
        reviewNote: parsed.data.reviewNote?.trim() || null,
        requestedRole: role === "OWNER" ? "ADMIN" : role,
      },
    });

    logger.info("Join request approved", {
      requestId: request.id,
      projectId: request.projectId,
      reviewerId: admin.id,
    });
    return updated;
  }

  // CREATE_PROJECT
  if (!request.proposedName) {
    throw new AppError("VALIDATION", "Create request is missing a project name.");
  }

  // createProject requires superadmin — we are one (admin becomes initial owner)
  const project = await createProject({
    name: request.proposedName,
    projectType: request.proposedType ?? "RESIDENTIAL",
    description: request.proposedDescription ?? undefined,
    address: request.proposedAddress ?? undefined,
    currency: "INR",
  });

  // Transfer ownership to requester; keep superadmin as ADMIN for oversight
  await prisma.project.update({
    where: { id: project.id },
    data: { ownerId: request.requesterId },
  });

  await prisma.projectMember.updateMany({
    where: { projectId: project.id, userId: admin.id },
    data: { role: "ADMIN" },
  });

  const existingRequester = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: {
        projectId: project.id,
        userId: request.requesterId,
      },
    },
  });
  if (existingRequester) {
    await prisma.projectMember.update({
      where: { id: existingRequester.id },
      data: { role: "OWNER", status: "ACTIVE", invitedById: admin.id },
    });
  } else {
    await prisma.projectMember.create({
      data: {
        projectId: project.id,
        userId: request.requesterId,
        role: "OWNER",
        status: "ACTIVE",
        invitedById: admin.id,
      },
    });
  }
  const updated = await projectAccessRequests().update({
    where: { id: request.id },
    data: {
      status: "APPROVED",
      projectId: project.id,
      reviewedById: admin.id,
      reviewedAt: new Date(),
      reviewNote: parsed.data.reviewNote?.trim() || null,
    },
  });

  logger.info("Create project request approved", {
    requestId: request.id,
    projectId: project.id,
    reviewerId: admin.id,
    requesterId: request.requesterId,
  });

  return updated;
}
