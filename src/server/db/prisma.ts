import { PrismaClient } from "@prisma/client";

import { env } from "@/config/env";
import { rewriteSoftDeleteArgs } from "@/server/db/soft-delete";

/**
 * Bump when adding Prisma models so Next.js HMR does not keep a stale
 * global client missing new delegates.
 */
const PRISMA_CLIENT_REV = 4;

type PrismaClientExtended = ReturnType<typeof createPrismaClient>;

const globalForPrisma = globalThis as unknown as {
  __kiPrisma?: PrismaClientExtended;
  __kiPrismaRev?: number;
};

function createPrismaClient() {
  void env.DATABASE_URL;

  return new PrismaClient({
    log: env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  }).$extends({
    query: {
      $allModels: {
        async $allOperations({ args, query }) {
          return query(rewriteSoftDeleteArgs(args));
        },
      },
    },
  });
}

function isUsable(client: PrismaClientExtended | undefined): client is PrismaClientExtended {
  return (
    !!client &&
    typeof (
      client as { projectAccessRequest?: { findMany?: unknown } }
    ).projectAccessRequest?.findMany === "function"
  );
}

function getClient(): PrismaClientExtended {
  if (
    globalForPrisma.__kiPrismaRev === PRISMA_CLIENT_REV &&
    isUsable(globalForPrisma.__kiPrisma)
  ) {
    return globalForPrisma.__kiPrisma;
  }

  const previous = globalForPrisma.__kiPrisma;
  if (previous) {
    void (previous as { $disconnect?: () => Promise<void> })
      .$disconnect?.()
      .catch(() => undefined);
  }

  // Drop any legacy cache keys from older prisma.ts revisions
  const g = globalThis as Record<string, unknown>;
  delete g.prisma;
  delete g.prismaClientRev;

  const client = createPrismaClient();
  if (!isUsable(client)) {
    throw new Error(
      "Prisma Client is missing ProjectAccessRequest. Run `pnpm exec prisma generate` and restart the dev server.",
    );
  }

  globalForPrisma.__kiPrisma = client;
  globalForPrisma.__kiPrismaRev = PRISMA_CLIENT_REV;
  return client;
}

export const prisma = getClient();
