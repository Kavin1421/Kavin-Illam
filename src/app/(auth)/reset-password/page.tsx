import type { Metadata } from "next";
import Link from "next/link";

import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Reset password",
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  const token = params.token?.trim() ?? "";

  return (
    <div className="mx-auto flex w-full max-w-md flex-col justify-center px-4 py-16 sm:px-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-2xl">Reset password</CardTitle>
          <CardDescription>
            Choose a new password for your Kavin Illam account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {token ? (
            <ResetPasswordForm token={token} />
          ) : (
            <p className="text-destructive text-sm" role="alert">
              This reset link is missing or invalid.
            </p>
          )}
          <p className="text-muted-foreground text-center text-sm">
            <Link href="/login" className="underline-offset-4 hover:underline">
              Back to sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
