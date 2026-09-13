import type { Metadata } from "next";
import Link from "next/link";

import { LoginForm } from "@/components/auth/login-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Sign in",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reset?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="mx-auto flex w-full max-w-md flex-col justify-center px-4 py-16 sm:px-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-2xl">Sign in</CardTitle>
          <CardDescription>
            Access your construction projects and finances.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {params.reset === "1" ? (
            <p className="text-sm text-emerald-700" role="status">
              Password updated. You can sign in now.
            </p>
          ) : null}
          <LoginForm />
          <div className="text-muted-foreground space-y-2 text-center text-sm">
            <p>
              <Link
                href="/forgot-password"
                className="underline-offset-4 hover:underline"
              >
                Forgot password?
              </Link>
            </p>
            <p>
              No account?{" "}
              <Link
                href="/register"
                className="underline-offset-4 hover:underline"
              >
                Create one
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
