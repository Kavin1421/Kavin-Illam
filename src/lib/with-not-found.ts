import { notFound } from "next/navigation";

import { AppError } from "@/lib/errors";

/**
 * Maps authz/anti-enumeration failures to Next.js 404 so unauthorized
 * callers cannot distinguish missing vs forbidden resources via UI.
 */
export async function withNotFound<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (
      error instanceof AppError &&
      (error.code === "NOT_FOUND" || error.code === "FORBIDDEN")
    ) {
      notFound();
    }
    throw error;
  }
}
