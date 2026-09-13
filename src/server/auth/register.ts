import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { absoluteUrl, sendEmail } from "@/server/email/send";
import { prisma } from "@/server/db/prisma";
import { registerSchema } from "@/validators/auth";

import { hashPassword } from "./password";
import { assertRateLimit, rateLimitKey } from "./rate-limit";
import { issueEmailToken } from "./tokens";

export async function registerUser(input: unknown) {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    throw new AppError("VALIDATION", "Please check your registration details.");
  }

  const email = parsed.data.email.toLowerCase().trim();
  const limit = assertRateLimit(rateLimitKey("register", email), 5, 15 * 60 * 1000);
  if (!limit.ok) {
    throw new AppError(
      "VALIDATION",
      `Too many registration attempts. Try again in ${limit.retryAfterSec}s.`,
    );
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new AppError(
      "CONFLICT",
      "An account with this email already exists. Sign in instead.",
    );
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email,
      phone: parsed.data.phone || null,
      passwordHash,
      status: "ACTIVE",
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      status: true,
      createdAt: true,
    },
  });

  try {
    const token = await issueEmailToken("email-verify", email);
    const verifyUrl = absoluteUrl(
      `/verify-email?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`,
    );
    await sendEmail({
      to: email,
      subject: "Verify your Kavin Illam email",
      text: `Welcome to Kavin Illam.\n\nVerify your email: ${verifyUrl}\n\nIf you did not create this account, ignore this message.`,
      html: `<p>Welcome to Kavin Illam.</p><p><a href="${verifyUrl}">Verify your email</a></p>`,
    });
  } catch (error) {
    logger.warn("Registration succeeded but verification email failed", {
      userId: user.id,
      error: error instanceof Error ? error.message : "unknown",
    });
  }

  logger.info("User registered", { userId: user.id });
  return user;
}
