import { prisma } from "@/server/db/prisma";

/**
 * Platform superadmins may create projects and approve access requests.
 * Default includes the platform owner; override/extend via SUPERADMIN_EMAILS
 * (comma-separated) in the environment.
 */
const DEFAULT_SUPERADMIN_EMAILS = ["kkavinkumar24@gmail.com"] as const;

export function getSuperadminEmails(): string[] {
  const fromEnv =
    process.env.SUPERADMIN_EMAILS?.split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean) ?? [];

  return [...new Set([...DEFAULT_SUPERADMIN_EMAILS, ...fromEnv])];
}

export function isSuperadminEmail(email: string | null | undefined): boolean {
  if (!email?.trim()) return false;
  return getSuperadminEmails().includes(email.trim().toLowerCase());
}

/**
 * Prefer session email, but fall back to DB lookup so JWT sessions without
 * email still recognize the platform owner.
 */
export async function resolveIsSuperadmin(user: {
  id: string;
  email?: string | null;
}): Promise<boolean> {
  if (isSuperadminEmail(user.email)) return true;
  const row = await prisma.user.findUnique({
    where: { id: user.id },
    select: { email: true },
  });
  return isSuperadminEmail(row?.email);
}
