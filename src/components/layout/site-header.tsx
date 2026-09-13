import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getOptionalUser } from "@/server/auth/session";
import { signOutAction } from "@/server/auth/sign-out";

export async function SiteHeader() {
  const user = await getOptionalUser();

  return (
    <header className="border-border/80 bg-background/90 sticky top-0 z-40 border-b backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="font-heading text-lg tracking-tight">
          Kavin Illam
        </Link>
        <nav className="flex items-center gap-2">
          {user ? (
            <>
              <Link
                href="/profile"
                className={cn(
                  buttonVariants({ variant: "ghost", size: "sm" }),
                  "hidden sm:inline-flex",
                )}
              >
                {user.name ?? user.email}
              </Link>
              <form action={signOutAction}>
                <Button type="submit" variant="outline" size="sm">
                  Sign out
                </Button>
              </form>
            </>
          ) : (
            <>
              <Link
                href="/register"
                className={cn(
                  buttonVariants({ variant: "ghost", size: "sm" }),
                  "hidden sm:inline-flex",
                )}
              >
                Register
              </Link>
              <Link
                href="/login"
                className={cn(buttonVariants({ size: "sm" }))}
              >
                Sign in
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
