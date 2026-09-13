import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { absoluteUrl, sendEmail } from "@/server/email/send";
import { prisma } from "@/server/db/prisma";
import { forgotPasswordSchema, resetPasswordSchema } from "@/validators/auth";

import { hashPassword } from "./password";
import { assertRateLimit, rateLimitKey } from "./rate-limit";
import { findAndConsumeTokenByRaw, issueEmailToken } from "./tokens";

export async function requestPasswordReset(input: unknown) {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) {
    throw new AppError("VALIDATION", "Enter a valid email address.");
  }

  const email = parsed.data.email.toLowerCase().trim();
  const limit = assertRateLimit(
    rateLimitKey("forgot-password", email),
    5,
    15 * 60 * 1000,
  );
  if (!limit.ok) {
    // Same generic response to avoid enumeration timing differences at UI layer
    return { ok: true as const };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user?.passwordHash || user.status === "DISABLED") {
    return { ok: true as const };
  }

  const token = await issueEmailToken("password-reset", email);
  const resetUrl = absoluteUrl(
    `/reset-password?token=${encodeURIComponent(token)}`,
  );

  try {
    await sendEmail({
      to: email,
      subject: "Reset your Kavin Illam password",
      text: `Reset your password: ${resetUrl}\n\nThis link expires in 1 hour.\nIf you did not request this, ignore this email.`,
      html: `<p><a href="${resetUrl}">Reset your password</a></p><p>This link expires in 1 hour.</p>`,
    });
  } catch (error) {
    logger.error("Password reset email failed", {
      error: error instanceof Error ? error.message : "unknown",
    });
    throw new AppError(
      "INTERNAL",
      "Unable to send reset email. Please try again later.",
    );
  }

  return { ok: true as const };
}

export async function resetPasswordWithToken(input: unknown) {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) {
    throw new AppError("VALIDATION", "Invalid reset request.");
  }

  const limit = assertRateLimit(
    rateLimitKey("reset-password", parsed.data.token.slice(0, 16)),
    10,
    15 * 60 * 1000,
  );
  if (!limit.ok) {
    throw new AppError("VALIDATION", "Too many attempts. Try again later.");
  }

  const matched = await findAndConsumeTokenByRaw(
    "password-reset",
    parsed.data.token,
  );
  if (!matched) {
    throw new AppError(
      "VALIDATION",
      "This reset link is invalid or has expired.",
    );
  }

  const user = await prisma.user.findUnique({
    where: { email: matched.email },
  });
  if (!user || user.status === "DISABLED") {
    throw new AppError(
      "VALIDATION",
      "This reset link is invalid or has expired.",
    );
  }

  const passwordHash = await hashPassword(parsed.data.password);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });

  logger.info("Password reset completed", { userId: user.id });
  return { ok: true as const };
}
