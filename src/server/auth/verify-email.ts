import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { prisma } from "@/server/db/prisma";

import { assertRateLimit, rateLimitKey } from "./rate-limit";
import { consumeEmailToken } from "./tokens";

export async function verifyEmailAddress(emailRaw: string, token: string) {
  const email = emailRaw.toLowerCase().trim();
  const limit = assertRateLimit(
    rateLimitKey("verify-email", email),
    10,
    15 * 60 * 1000,
  );
  if (!limit.ok) {
    throw new AppError("VALIDATION", "Too many attempts. Try again later.");
  }

  const ok = await consumeEmailToken("email-verify", email, token);
  if (!ok) {
    throw new AppError(
      "VALIDATION",
      "This verification link is invalid or has expired.",
    );
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new AppError(
      "VALIDATION",
      "This verification link is invalid or has expired.",
    );
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: new Date() },
  });

  logger.info("Email verified", { userId: user.id });
  return { ok: true as const };
}
