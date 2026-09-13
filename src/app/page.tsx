import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getOptionalUser } from "@/server/auth/session";

export default async function HomePage() {
  const user = await getOptionalUser();

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-16">
      <section className="max-w-2xl space-y-5">
        <Badge variant="secondary">Phase 2 · Authentication</Badge>
        <h1 className="font-heading text-4xl leading-tight tracking-tight sm:text-5xl">
          Kavin Illam
        </h1>
        <p className="text-muted-foreground text-lg leading-relaxed">
          A private, multi-project construction management portal for expenses,
          advances, payment requests, documents, and collaboration — built with
          security and financial correctness first.
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          {user ? (
            <Link
              href="/profile"
              className={cn(buttonVariants({ size: "lg" }))}
            >
              Open profile
            </Link>
          ) : (
            <>
              <Link
                href="/register"
                className={cn(buttonVariants({ size: "lg" }))}
              >
                Create account
              </Link>
              <Link
                href="/login"
                className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
              >
                Sign in
              </Link>
            </>
          )}
          <Link
            href="/api/health"
            className={cn(buttonVariants({ variant: "ghost", size: "lg" }))}
          >
            Health check
          </Link>
        </div>
      </section>

      <section className="mt-12 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Secure accounts</CardTitle>
            <CardDescription>
              Registration, sessions, password recovery, and email verification.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">
            Collaborator invitations are ready for Phase 3 project binding.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Auditable finance</CardTitle>
            <CardDescription>
              Ledger-style transactions with integer money units.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">
            Core finance modules begin in Phase 5.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Secure documents</CardTitle>
            <CardDescription>
              Cloudinary private delivery with server-side authorization.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">
            Document workflows begin in Phase 8.
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
