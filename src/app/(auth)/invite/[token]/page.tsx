import type { Metadata } from "next";
import Link from "next/link";

import { AcceptInviteForm } from "@/components/auth/accept-invite-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getInvitationByRawToken } from "@/server/invitations/service";

export const metadata: Metadata = {
  title: "Accept invitation",
};

export default async function InviteAcceptPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token: raw } = await params;
  const token = decodeURIComponent(raw);
  const invitation = await getInvitationByRawToken(token);

  return (
    <div className="mx-auto flex w-full max-w-md flex-col justify-center px-4 py-16 sm:px-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-2xl">
            Accept invitation
          </CardTitle>
          <CardDescription>
            {invitation
              ? `Join Kavin Illam as ${invitation.role.toLowerCase()} (${invitation.email}).`
              : "This invitation is invalid or has expired."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {invitation ? (
            <AcceptInviteForm token={token} defaultName={invitation.name} />
          ) : (
            <p className="text-destructive text-sm" role="alert">
              Ask the project owner to send a new invitation.
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
