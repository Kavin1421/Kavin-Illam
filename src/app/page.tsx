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
        <Badge variant="secondary">Phase 3 · Projects</Badge>
        <h1 className="text-display text-foreground">
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
              href="/projects"
              className={cn(buttonVariants({ size: "lg" }))}
            >
              Open projects
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
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                )}
              >
                Sign in
              </Link>
            </>
          )}
        </div>
      </section>

      <section className="mt-12 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Multi-project</CardTitle>
            <CardDescription>
              Isolated members, settings, and future finance per project.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">
            Switch projects from the header without mixing data.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Roles & invites</CardTitle>
            <CardDescription>
              Invite engineers and collaborators into a specific project.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">
            Accepting an invite creates project membership with the assigned
            role.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Authorization ready</CardTitle>
            <CardDescription>
              Membership and permission checks run on the server.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">
            Phase 4 expands isolation tests and visibility enforcement.
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
