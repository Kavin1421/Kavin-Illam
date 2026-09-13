import { auth } from "@/server/auth";
import { AppError } from "@/lib/errors";

export async function requireAuthenticatedUser() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new AppError("UNAUTHORIZED", "You must be signed in to continue.");
  }
  return session.user;
}

export async function getOptionalUser() {
  const session = await auth();
  return session?.user ?? null;
}
