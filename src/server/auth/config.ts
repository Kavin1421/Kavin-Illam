import type { NextAuthConfig } from "next-auth";

const publicExact = new Set([
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
]);

function isPublicPath(pathname: string): boolean {
  if (publicExact.has(pathname)) return true;
  if (pathname.startsWith("/invite/")) return true;
  if (pathname.startsWith("/api/auth")) return true;
  if (pathname.startsWith("/api/health")) return true;
  return false;
}

/**
 * Edge-compatible Auth.js config (no Node-only imports).
 * Full auth (adapter, credentials) lives in `./index.ts`.
 */
export const authConfig = {
  providers: [],
  pages: {
    signIn: "/login",
  },
  session: {
    // Credentials provider requires JWT sessions in Auth.js.
    // Prisma Session/Account models remain for adapter + future providers.
    strategy: "jwt",
  },
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      if (isPublicPath(pathname)) {
        return true;
      }
      return !!auth?.user;
    },
    jwt({ token, user, trigger, session }) {
      if (user) {
        token.sub = user.id;
        if (user.email) token.email = user.email;
        if (user.name) token.name = user.name;
      }
      if (trigger === "update" && session?.user) {
        if (typeof session.user.name === "string") {
          token.name = session.user.name;
        }
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        if (typeof token.name === "string") {
          session.user.name = token.name;
        }
        if (typeof token.email === "string") {
          session.user.email = token.email;
        }
      }
      return session;
    },
  },
  trustHost: true,
} satisfies NextAuthConfig;
