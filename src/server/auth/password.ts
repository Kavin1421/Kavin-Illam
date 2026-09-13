import { createHash, randomBytes } from "node:crypto";

import bcrypt from "bcryptjs";

const BCRYPT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}

/** Opaque URL-safe token for email links */
export function generateOpaqueToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

/** Store only hashes of email tokens in the database */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
