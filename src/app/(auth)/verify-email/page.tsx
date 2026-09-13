import type { Metadata } from "next";
import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { verifyEmailAction } from "@/server/auth/actions";

export const metadata: Metadata = {
  title: "Verify email",
};

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; email?: string }>;
}) {
  const params = await searchParams;
  const token = params.token?.trim() ?? "";
  const email = params.email?.trim() ?? "";

  let message = "Missing verification details.";
  let ok = false;

  if (token && email) {
    const result = await verifyEmailAction(email, token);
    ok = !result.error;
    message = result.error ?? result.success ?? message;
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col justify-center px-4 py-16 sm:px-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-2xl">Verify email</CardTitle>
          <CardDescription>
            Confirm your email address to finish account setup.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p
            className={
              ok ? "text-sm text-emerald-700" : "text-destructive text-sm"
            }
            role={ok ? "status" : "alert"}
          >
            {message}
          </p>
          <p className="text-muted-foreground text-center text-sm">
            <Link href="/login" className="underline-offset-4 hover:underline">
              Continue to sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
