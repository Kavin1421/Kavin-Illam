import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { env } from "@/config/env";
import { logger } from "@/lib/logger";
import { prisma } from "@/server/db/prisma";
import { loginSchema } from "@/validators/auth";

import { authConfig } from "./config";
import { verifyPassword } from "./password";

void env.AUTH_SECRET;

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) {
          return null;
        }

        const email = parsed.data.email.toLowerCase().trim();
        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user?.passwordHash || user.status !== "ACTIVE") {
          return null;
        }

        const valid = await verifyPassword(
          parsed.data.password,
          user.passwordHash,
        );
        if (!valid) {
          return null;
        }

        try {
          await prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
          });
        } catch (error) {
          logger.warn("Failed to update lastLoginAt", {
            userId: user.id,
            error: error instanceof Error ? error.message : "unknown",
          });
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
});
