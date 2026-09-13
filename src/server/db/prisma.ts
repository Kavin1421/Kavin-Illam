import { PrismaClient } from "@prisma/client";

import { env } from "@/config/env";
import { rewriteSoftDeleteArgs } from "@/server/db/soft-delete";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientExtended | undefined;
};

function createPrismaClient() {
  // Touch env so DATABASE_URL / AUTH_SECRET are validated before DB use
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

type PrismaClientExtended = ReturnType<typeof createPrismaClient>;

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
