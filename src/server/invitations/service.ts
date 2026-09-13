import type { ProjectRole } from "@prisma/client";

import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { absoluteUrl, sendEmail } from "@/server/email/send";
import { prisma } from "@/server/db/prisma";
import {
  acceptInvitationSchema,
  createInvitationSchema,
} from "@/validators/auth";

import { hashPassword, generateOpaqueToken, hashToken } from "@/server/auth/password";
import { requireAuthenticatedUser } from "@/server/auth/session";
import { assertRateLimit, rateLimitKey } from "@/server/auth/rate-limit";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export async function createInvitation(input: unknown) {
  const inviter = await requireAuthenticatedUser();
  const parsed = createInvitationSchema.safeParse(input);
  if (!parsed.success) {
    throw new AppError("VALIDATION", "Please check the invitation details.");
  }

  const email = parsed.data.email.toLowerCase().trim();
  const limit = assertRateLimit(
    rateLimitKey("invite", inviter.id),
    20,
    60 * 60 * 1000,
  );
  if (!limit.ok) {
    throw new AppError("VALIDATION", "Too many invitations. Try again later.");
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser?.status === "ACTIVE" && existingUser.passwordHash) {
    throw new AppError(
      "CONFLICT",
      "This email already has an active account.",
    );
  }

  const rawToken = generateOpaqueToken();
  const tokenHash = hashToken(rawToken);

  await prisma.invitation.updateMany({
    where: { email, status: "PENDING" },
    data: { status: "REVOKED" },
  });

  const invitation = await prisma.invitation.create({
    data: {
      email,
      name: parsed.data.name,
      role: parsed.data.role as ProjectRole,
      projectId: parsed.data.projectId || null,
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
      subject: "You're invited to Kavin Illam",
      text: `${inviter.name ?? "A collaborator"} invited you to Kavin Illam as ${parsed.data.role}.\n\nAccept: ${inviteUrl}\n\nThis invite expires in 7 days.`,
      html: `<p>You have been invited to Kavin Illam as <strong>${parsed.data.role}</strong>.</p><p><a href="${inviteUrl}">Accept invitation</a></p>`,
    });
  } catch (error) {
    logger.warn("Invitation created but email failed", {
      invitationId: invitation.id,
      error: error instanceof Error ? error.message : "unknown",
    });
  }

  logger.info("Invitation created", {
    invitationId: invitation.id,
    invitedById: inviter.id,
  });

  // Return raw token only to the inviter (for copy-link UX in Phase 3 UI).
  return {
    id: invitation.id,
    email: invitation.email,
    role: invitation.role,
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

  return invitation;
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

  const passwordHash = await hashPassword(parsed.data.password);
  const email = invitation.email.toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email } });
  let userId: string;

  if (existing) {
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
  });

  return {
    userId,
    email,
    role: invitation.role,
    projectId: invitation.projectId,
  };
}
