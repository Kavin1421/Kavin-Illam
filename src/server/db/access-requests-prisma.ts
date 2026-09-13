import { PrismaClient } from "@prisma/client";

import { env } from "@/config/env";

/**
 * Dedicated non-extended Prisma client for ProjectAccessRequest.
 * Avoids Next/Turbopack HMR keeping a stale extended singleton that was
 * created before this model existed (undefined.findMany crashes).
 */
const PAR_REV = 1;

const globalForPar = globalThis as unknown as {
  __kiAccessRequestPrisma?: PrismaClient;
  __kiAccessRequestPrismaRev?: number;
};

function getAccessRequestPrisma(): PrismaClient {
  void env.DATABASE_URL;

  const cached = globalForPar.__kiAccessRequestPrisma;
  if (
    globalForPar.__kiAccessRequestPrismaRev === PAR_REV &&
    cached &&
    typeof cached.projectAccessRequest?.findMany === "function"
  ) {
    return cached;
  }

  if (cached) {
    void cached.$disconnect().catch(() => undefined);
  }

  const client = new PrismaClient({
    log: env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

  if (typeof client.projectAccessRequest?.findMany !== "function") {
    throw new Error(
      "Prisma Client is missing ProjectAccessRequest. Run `pnpm exec prisma generate`, delete `.next`, and restart `pnpm dev`.",
    );
  }

  globalForPar.__kiAccessRequestPrisma = client;
  globalForPar.__kiAccessRequestPrismaRev = PAR_REV;
  return client;
}

export function projectAccessRequests() {
  return getAccessRequestPrisma().projectAccessRequest;
}
