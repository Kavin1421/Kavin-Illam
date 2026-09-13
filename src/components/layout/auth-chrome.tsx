import Link from "next/link";
import type { ReactNode } from "react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getOptionalUser } from "@/server/auth/session";

export async function AuthChrome({ children }: { children: ReactNode }) {
  const user = await getOptionalUser();

  return (
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[rgba(6,63,58,0.55)] backdrop-blur-xl">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="gradient-primary text-primary-foreground flex size-8 items-center justify-center rounded-lg font-heading text-xs font-semibold shadow-[0_0_16px_rgba(0,208,132,0.25)]">
              KI
            </span>
            <span className="font-heading text-lg tracking-[-0.03em] text-white">
              Kavin Illam
            </span>
          </Link>
          <nav className="flex items-center gap-2 text-sm">
            {user ? (
              <Link
                href="/projects"
                className={cn(buttonVariants({ size: "sm" }))}
              >
                Open projects
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-2 text-muted-white transition-ki-fast hover:text-white"
                >
                  Sign in
                </Link>
                <Link
                  href="/register"
                  className={cn(buttonVariants({ size: "sm" }))}
                >
                  Register
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="animate-page-in flex-1">{children}</main>
      <footer className="border-t border-white/10 py-5 text-center text-xs text-muted-white">
        Kavin Illam · Build Dreams. Track Progress.
      </footer>
    </div>
  );
}
