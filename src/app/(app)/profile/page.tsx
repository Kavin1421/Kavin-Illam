import type { Metadata } from "next";
import Link from "next/link";

import {
  ChangePasswordForm,
  ProfileForm,
} from "@/components/auth/profile-forms";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatDateTime } from "@/lib/dates";
import { getCurrentProfile } from "@/server/auth/profile";

export const metadata: Metadata = {
  title: "Profile",
};

export default async function ProfilePage() {
  const profile = await getCurrentProfile();

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-10 sm:px-6">
      <div className="space-y-2">
        <h1 className="font-heading text-3xl tracking-tight">Profile</h1>
        <p className="text-muted-foreground text-sm">
          Manage your account details and security.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>
            {profile.email}
            {profile.emailVerified ? (
              <Badge className="ml-2" variant="secondary">
                Verified
              </Badge>
            ) : (
              <Badge className="ml-2" variant="outline">
                Unverified
              </Badge>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-muted-foreground space-y-1 text-sm">
          <p>Status: {profile.status}</p>
          <p>
            Last login:{" "}
            {profile.lastLoginAt
              ? formatDateTime(profile.lastLoginAt)
              : "Never"}
          </p>
          <p>Member since: {formatDateTime(profile.createdAt)}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Profile details</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileForm name={profile.name ?? ""} phone={profile.phone} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Security</CardTitle>
          <CardDescription>Change your password.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>

      <Separator />
      <p className="text-muted-foreground text-sm">
        <Link href="/projects" className="underline-offset-4 hover:underline">
          Back to projects
        </Link>
      </p>
    </div>
  );
}
