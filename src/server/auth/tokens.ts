import { prisma } from "@/server/db/prisma";

import { generateOpaqueToken, hashToken } from "./password";

const ONE_HOUR_MS = 60 * 60 * 1000;
const ONE_DAY_MS = 24 * ONE_HOUR_MS;

export type TokenPurpose = "email-verify" | "password-reset";

function identifierFor(purpose: TokenPurpose, email: string): string {
  return `${purpose}:${email.toLowerCase().trim()}`;
}

export async function issueEmailToken(
  purpose: TokenPurpose,
  email: string,
  ttlMs: number = purpose === "password-reset" ? ONE_HOUR_MS : ONE_DAY_MS,
): Promise<string> {
  const raw = generateOpaqueToken();
  const token = hashToken(raw);
  const identifier = identifierFor(purpose, email);

  await prisma.verificationToken.deleteMany({ where: { identifier } });
  await prisma.verificationToken.create({
    data: {
      identifier,
      token,
      expires: new Date(Date.now() + ttlMs),
    },
  });

  return raw;
}

export async function consumeEmailToken(
  purpose: TokenPurpose,
  email: string,
  rawToken: string,
): Promise<boolean> {
  const identifier = identifierFor(purpose, email);
  const token = hashToken(rawToken);
  const record = await prisma.verificationToken.findUnique({
    where: {
      identifier_token: { identifier, token },
    },
  });

  if (!record || record.expires.getTime() < Date.now()) {
    if (record) {
      await prisma.verificationToken.delete({
        where: { id: record.id },
      });
    }
    return false;
  }

  await prisma.verificationToken.delete({ where: { id: record.id } });
  return true;
}

/** Lookup by hashed token alone (reset links may not include email). */
export async function findAndConsumeTokenByRaw(
  purpose: TokenPurpose,
  rawToken: string,
): Promise<{ email: string } | null> {
  const token = hashToken(rawToken);
  const prefix = `${purpose}:`;
  const record = await prisma.verificationToken.findFirst({
    where: { token },
  });

  if (
    !record ||
    !record.identifier.startsWith(prefix) ||
    record.expires.getTime() < Date.now()
  ) {
    return null;
  }

  await prisma.verificationToken.delete({ where: { id: record.id } });
  const email = record.identifier.slice(prefix.length);
  return { email };
}
