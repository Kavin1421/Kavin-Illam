import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { prisma } from "@/server/db/prisma";
import {
  changePasswordSchema,
  profileUpdateSchema,
} from "@/validators/auth";

import { hashPassword, verifyPassword } from "./password";
import { requireAuthenticatedUser } from "./session";

const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  image: true,
  status: true,
  emailVerified: true,
  createdAt: true,
  updatedAt: true,
  lastLoginAt: true,
} as const;

export async function getCurrentProfile() {
  const sessionUser = await requireAuthenticatedUser();
  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: publicUserSelect,
  });
  if (!user) {
    throw new AppError("NOT_FOUND", "User profile was not found.");
  }
  return user;
}

export async function updateCurrentProfile(input: unknown) {
  const sessionUser = await requireAuthenticatedUser();
  const parsed = profileUpdateSchema.safeParse(input);
  if (!parsed.success) {
    throw new AppError("VALIDATION", "Please check your profile details.");
  }

  const user = await prisma.user.update({
    where: { id: sessionUser.id },
    data: {
      name: parsed.data.name,
      phone: parsed.data.phone || null,
    },
    select: publicUserSelect,
  });

  logger.info("Profile updated", { userId: user.id });
  return user;
}

export async function changeCurrentPassword(input: unknown) {
  const sessionUser = await requireAuthenticatedUser();
  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) {
    throw new AppError("VALIDATION", "Please check your password details.");
  }

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { id: true, passwordHash: true },
  });

  if (!user?.passwordHash) {
    throw new AppError("VALIDATION", "Password change is not available.");
  }

  const valid = await verifyPassword(
    parsed.data.currentPassword,
    user.passwordHash,
  );
  if (!valid) {
    throw new AppError("VALIDATION", "Current password is incorrect.");
  }

  const passwordHash = await hashPassword(parsed.data.newPassword);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });

  logger.info("Password changed", { userId: user.id });
  return { ok: true as const };
}
