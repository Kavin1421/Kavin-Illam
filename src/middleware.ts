import NextAuth from "next-auth";

import { authConfig } from "@/server/auth/config";

/**
 * Edge-safe Auth.js middleware with Phase 2 route protection.
 * Protected: /profile, /account, and future app routes.
 */
export default NextAuth(authConfig).auth;

export const config = {
  matcher: ["/((?!api/health|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
