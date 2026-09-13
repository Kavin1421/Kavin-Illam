import type { ProjectRole } from "@prisma/client";
import { z } from "zod";

import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { hashPassword, generateOpaqueToken, hashToken, verifyPassword } from "@/server/auth/password";
import { requireAuthenticatedUser } from "@/server/auth/session";
import { getOptionalUser } from "@/server/auth/session";
import { assertRateLimit, rateLimitKey } from "@/server/auth/rate-limit";
import { requireProjectPermission } from "@/server/authorization";
import { absoluteUrl, sendEmail } from "@/server/email/send";
import { prisma } from "@/server/db/prisma";
import { ensureProjectMembership } from "@/server/projects/members";
import {
  acceptInvitationSchema,
} from "@/validators/auth";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const createProjectInvitationSchema = z.object({
  email: z.string().trim().email().max(254),
  name: z.string().trim().min(2).max(100).optional().or(z.literal("")),
  role: z
    .enum([
      "ENGINEER",
      "CONTRACTOR",
      "ARCHITECT",
      "ACCOUNTANT",
      "VIEWER",
      "ADMIN",
    ])
    .default("ENGINEER"),
  projectId: z.string().min(1),
});

export async function createInvitation(input: unknown) {
  const inviter = await requireAuthenticatedUser();
  const parsed = createProjectInvitationSchema.safeParse(input);
  if (!parsed.success) {
    throw new AppError("VALIDATION", "Please check the invitation details.");
  }

  const ctx = await requireProjectPermission(
    parsed.data.projectId,
    "MEMBER_INVITE",
  );

  const email = parsed.data.email.toLowerCase().trim();
  const limit = assertRateLimit(
    rateLimitKey("invite", `${inviter.id}:${ctx.project.id}`),
    20,
    60 * 60 * 1000,
  );
  if (!limit.ok) {
    throw new AppError("VALIDATION", "Too many invitations. Try again later.");
  }

  if (email === inviter.email?.toLowerCase()) {
    throw new AppError("VALIDATION", "You cannot invite yourself.");
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    const existingMember = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId: ctx.project.id,
          userId: existingUser.id,
        },
      },
    });
    if (existingMember?.status === "ACTIVE") {
      throw new AppError(
        "CONFLICT",
        "This user is already a member of the project.",
      );
    }
  }

  const rawToken = generateOpaqueToken();
  const tokenHash = hashToken(rawToken);

  await prisma.invitation.updateMany({
    where: {
      email,
      projectId: ctx.project.id,
      status: "PENDING",
    },
    data: { status: "REVOKED" },
  });

  const invitation = await prisma.invitation.create({
    data: {
      email,
      name: parsed.data.name || null,
      role: parsed.data.role as ProjectRole,
      projectId: ctx.project.id,
      tokenHash,
      invitedById: inviter.id,
      expiresAt: new Date(Date.now() + INVITE_TTL_MS),
      status: "PENDING",
    },
  });

  const inviteUrl = absoluteUrl(`/invite/${encodeURIComponent(rawToken)}`);

  try {
    await sendEmail({
      to: email,
      subject: `Invitation to ${ctx.project.name}`,
      text: `${inviter.name ?? "A collaborator"} invited you to ${ctx.project.name} as ${parsed.data.role}.\n\nAccept: ${inviteUrl}\n\nThis invite expires in 7 days.`,
      html: `<p>You have been invited to <strong>${ctx.project.name}</strong> as <strong>${parsed.data.role}</strong>.</p><p><a href="${inviteUrl}">Accept invitation</a></p>`,
    });
  } catch (error) {
    logger.warn("Invitation created but email failed", {
      invitationId: invitation.id,
      error: error instanceof Error ? error.message : "unknown",
    });
  }

  logger.info("Project invitation created", {
    invitationId: invitation.id,
    projectId: ctx.project.id,
    invitedById: inviter.id,
  });

  return {
    id: invitation.id,
    email: invitation.email,
    role: invitation.role,
    projectId: ctx.project.id,
    projectSlug: ctx.project.slug,
    expiresAt: invitation.expiresAt,
    inviteUrl,
  };
}

export async function getInvitationByRawToken(rawToken: string) {
  const tokenHash = hashToken(rawToken);
  const invitation = await prisma.invitation.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
      expiresAt: true,
      projectId: true,
      invitedById: true,
    },
  });

  if (!invitation) {
    return null;
  }

  if (
    invitation.status !== "PENDING" ||
    invitation.expiresAt.getTime() < Date.now()
  ) {
    if (
      invitation.status === "PENDING" &&
      invitation.expiresAt.getTime() < Date.now()
    ) {
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: "EXPIRED" },
      });
    }
    return null;
  }

  let project: { id: string; name: string; slug: string } | null = null;
  if (invitation.projectId) {
    project = await prisma.project.findUnique({
      where: { id: invitation.projectId },
      select: { id: true, name: true, slug: true },
    });
  }

  return { ...invitation, project };
}

export async function acceptInvitation(input: unknown) {
  const parsed = acceptInvitationSchema.safeParse(input);
  if (!parsed.success) {
    throw new AppError("VALIDATION", "Please check your invitation details.");
  }

  const limit = assertRateLimit(
    rateLimitKey("accept-invite", parsed.data.token.slice(0, 16)),
    10,
    15 * 60 * 1000,
  );
  if (!limit.ok) {
    throw new AppError("VALIDATION", "Too many attempts. Try again later.");
  }

  const invitation = await getInvitationByRawToken(parsed.data.token);
  if (!invitation) {
    throw new AppError(
      "VALIDATION",
      "This invitation is invalid or has expired.",
    );
  }

  if (!invitation.projectId || !invitation.project) {
    throw new AppError(
      "VALIDATION",
      "This invitation is not linked to a project.",
    );
  }

  const email = invitation.email.toLowerCase();
  const sessionUser = await getOptionalUser();
  const existing = await prisma.user.findUnique({ where: { email } });

  let userId: string;

  if (existing?.passwordHash) {
    const sessionMatches =
      sessionUser?.email?.toLowerCase() === email &&
      sessionUser.id === existing.id;

    if (!sessionMatches) {
      const valid = await verifyPassword(
        parsed.data.password,
        existing.passwordHash,
      );
      if (!valid) {
        throw new AppError(
          "VALIDATION",
          "Incorrect password for this account.",
        );
      }
    }

    await prisma.user.update({
      where: { id: existing.id },
      data: {
        name: parsed.data.name || existing.name,
        status: "ACTIVE",
      },
    });
    userId = existing.id;
  } else if (existing) {
    const passwordHash = await hashPassword(parsed.data.password);
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        name: parsed.data.name,
        passwordHash,
        status: "ACTIVE",
        emailVerified: new Date(),
      },
    });
    userId = existing.id;
  } else {
    const passwordHash = await hashPassword(parsed.data.password);
    const created = await prisma.user.create({
      data: {
        email,
        name: parsed.data.name,
        passwordHash,
        status: "ACTIVE",
        emailVerified: new Date(),
      },
    });
    userId = created.id;
  }

  await ensureProjectMembership({
    projectId: invitation.projectId,
    userId,
    role: invitation.role,
    invitedById: invitation.invitedById,
  });

  await prisma.invitation.update({
    where: { id: invitation.id },
    data: {
      status: "ACCEPTED",
      acceptedAt: new Date(),
    },
  });

  logger.info("Invitation accepted", {
    invitationId: invitation.id,
    userId,
    projectId: invitation.projectId,
  });

  return {
    userId,
    email,
    role: invitation.role,
    projectId: invitation.projectId,
    projectSlug: invitation.project.slug,
  };
}

export async function listPendingInvitations(projectId: string) {
  await requireProjectPermission(projectId, "MEMBER_VIEW");
  return prisma.invitation.findMany({
    where: { projectId, status: "PENDING" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      expiresAt: true,
      createdAt: true,
    },
  });
}
